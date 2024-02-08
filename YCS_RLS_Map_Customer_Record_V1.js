/**
 * @NApiVersion 2.x
 * @NScriptType restlet
*/
define(['N/search', 'N/https', 'N/http', 'N/record', './YCS_Library'],
       function (search, https, http, record, library) {

  var TRIGGER_ON_CREATION = "On Record Creation";
  var CUSTOMER_RECORD_ID_CUST = "-2";
  var CUSTOMER_RECORD_ID_VEN = "-3";
  var customerErrMsg = "";
  function UpdateExistingCustomerInNetSuiteFromSF(context) {
    var response = "";
    try {
      var startTime = new Date();
      customerErrMsg = "Script Execution Starts for Customer record update from Salesforce to NetSuite. \n";
      log.debug("context", context);
      if (context) {
        //record Type						
        var arrCustList = context.Customer;

        if (arrCustList && arrCustList.length > 0) {
          var objCust = arrCustList[0];

          var oldCustomer = "";
          var oldVendor = "";

          //If record details object presents
          if (objCust) {
            log.debug("Customer Record Details", JSON.stringify(objCust));

            var sfAccountType = objCust.custentity_pppmi_sf_account_type;
            log.debug("sfAccountType", sfAccountType);

            var sfAccountId = objCust.custentity_external_id;
            log.debug("sfAccountId", sfAccountId);
            if (sfAccountId) {
              sfAccountId = GetTruncatedCustomerExternalId(sfAccountId);
              log.debug("Truncated sfAccountId", sfAccountId);
              //For existing customer
              oldCustomer = CheckIfCustomerVendorExists(sfAccountId, sfAccountType);
              log.debug("oldCustomer", oldCustomer);

              //Get Customer SF information including Address details
              var objCustomerInfo = objCust;  // comment by pankaj no need addres  // GetSalesForceAccountDetails(sfAccountId, objCust);
              log.debug("objCustomerInfo before Create/Update", objCustomerInfo);
              if (!oldCustomer) {

                response = CreateCustomerVendor(objCustomerInfo);
              }
              else { //Customer record exists 

                response = UpdateCustomerVendor(oldCustomer, objCustomerInfo);
              }
            }
          }
        }
      }
      if (customerErrMsg) {
        //library.ErrorEmailLog(156,customerErrMsg);//As of now we are hard coding config id to 156
        //Write in Error Log File
        library.JSONFile(customerErrMsg, startTime, '');
      }
      return response;
    } catch (ex) {
      log.error("Error in Customer RESTLet", ex.message);
      customerErrMsg += "Error in Updating Customer record for Sf ID " + sfAccountId + " From SF to NetSuite: ";
      customerErrMsg += ex.message;
      customerErrMsg += '\n';
      //Write in Error Log File
      library.JSONFile(customerErrMsg, startTime, '');
      return "Customer record couldn't be updated due to this error; " + ex.message;
    }
  }

  function searchresource(emailid) {

    var GetEmpObj = "";
    try {
      var employeeSearchObj = search.create({
        type: "employee",
        filters:
        [
          ["email", "is", emailid],
          "AND",
          ["isinactive", "is", "F"],
          "AND",
          ["salesrep", "is", "T"]
        ]
      });
      var searchResultCount = employeeSearchObj.runPaged().count;
      log.debug("employeeSearchObj result count", searchResultCount);
      employeeSearchObj.run().each(function (result) {
        GetEmpObj = result.id;
        return false;
      });


    }
    catch (ex1) {

      log.error("employeeSearchObj result count", ex1);

    }
    return GetEmpObj;
  }

  function GetTruncatedCustomerExternalId(sfCustId) {
    return sfCustId;
    /*try{
          if(sfCustId.length == 18){
            sfCustId = sfCustId.slice(0, -3);
          }
          return sfCustId;
        }catch(ex){
          log.error("Error getting truncated Customer External ID", ex.message);
          customerErrMsg += "Error getting truncated Customer External ID: " + ex.message + ". \n";
          return "";
        }*/
  }

  function CreateCustomerVendor(objCust) {
    try {
      var response = "";
      //Create Customer/Vendor

      //log.debug("Step1-");

      var sfAccountType = objCust.custentity_pppmi_sf_account_type;
      log.debug("sfAccountType", sfAccountType);

      var objCustomer = '';
      var subsidiary = "", customForm = "", multisub = "", multicurrency = "";
      var objSetup = new Object();

      if (sfAccountType == 'Customer') {
        objCustomer = record.create({
          type: "customer",
          isDynamic: true
        });
        var customrecord_ycs_entity_objectsetupSearchObj = search.create({
          type: "customrecord_ycs_entity_objectsetup",
          filters:
          [
            search.createFilter({
              name: 'custrecord_ns_entity_type',
              operator: search.Operator.ANYOF,
              values: CUSTOMER_RECORD_ID_CUST
            }),
            search.createFilter({
              name: 'isinactive',
              operator: search.Operator.IS,
              values: 'F'
            })
          ],
          columns:
          [
            "internalid",
            "custrecord_ns_entity_type",
            "custrecord_sf_entity_rec_type",
            "custrecord_default_subsidiary",
            "custrecord_default_customer_form",
            "custrecord_ns_entity_subsidiary",
            // "custrecord_ycs_currency"

          ]
        });
      } else {

        objCustomer = record.create({
          type: "vendor",
          isDynamic: true
        });
        var customrecord_ycs_entity_objectsetupSearchObj = search.create({
          type: "customrecord_ycs_entity_objectsetup",
          filters:
          [
            search.createFilter({
              name: 'custrecord_ns_entity_type',
              operator: search.Operator.ANYOF,
              values: CUSTOMER_RECORD_ID_VEN
            }),
            search.createFilter({
              name: 'isinactive',
              operator: search.Operator.IS,
              values: 'F'
            })
          ],
          columns:
          [
            "internalid",
            "custrecord_ns_entity_type",
            "custrecord_sf_entity_rec_type",
            "custrecord_default_subsidiary",
            "custrecord_default_customer_form",
            "custrecord_ns_entity_subsidiary",
            // "custrecord_ycs_currency"

          ]
        });
      }

      //log.debug("Step2-");

      var searchResultCount = customrecord_ycs_entity_objectsetupSearchObj.runPaged().count;
      log.debug("customrecord_ycs_entity_objectsetupSearchObj result count", searchResultCount);
      customrecord_ycs_entity_objectsetupSearchObj.run().each(function (result) {
        subsidiary = result.getValue("custrecord_default_subsidiary");
        customForm = result.getValue("custrecord_default_customer_form");
        multisub = result.getValue("custrecord_ns_entity_subsidiary");
        // multicurrency=result.getValue("custrecord_ycs_currency");
        return false;
      });

      //log.debug("Step4-");
      //log.debug("subsidiary", subsidiary);
      //log.debug("customForm", customForm);
      //log.debug("multisub", multisub);


      objCustomer.setValue("subsidiary", subsidiary);
      objCustomer.setValue("customform", customForm);
      objCustomer.setValue("isperson", "F");
      objCustomer.setValue("pricelevel", "1");
      objCustomer.setValue("autoname", true);
      // objCustomer.setValue("autoname", true);				

      //var arrCustMainFlds = Object.getOwnPropertyNames(objCust);
      //log.debug("arrCustMainFlds in CreateCustomer()", arrCustMainFlds);
      //log.debug('Values Set');

      var fldType = "", fldValue = "", fldId = "";
      for (var prop in objCust) {

        fldType = "", fldValue = "";
        fldValue = objCust[prop];
        log.debug("Prop - Prop Value - fldValue create : ", prop + " - " + objCust[prop] + " - " + fldValue);

        //Set Main field value
        if (prop != "addressbook" && prop != "addressbookshipping") {
          try {
            //log.debug("Field Value create : ", fldValue);

            if (fldValue) {
              //Don't set any field value, if parameter contains capital letter
              if (library.InitialIsCapital(prop)) {
                log.debug("Its a SF field, so no need to set field");
                continue;
              }

              //get Field Type
              fldType = objCustomer.getField({
                fieldId: prop
              }).type;

              log.debug("Field type create : ", fldType);
              if (fldType == "date") {
                //Set Body field
                if (fldValue) {
                  var newDate = parseAndFormatDateString(fldValue);
                  log.debug("newDate", newDate);
                  objCustomer.setValue(prop, newDate);
                  if (prop == "startdate") {
                    startDate = newDate;
                  }
                  if (prop == "enddate") {
                    endDate = newDate;
                  }
                }
              }
              else if (fldType == "percent") {
                //Set Body field
                if (fldValue) {
                  objCustomer.setValue(prop, fldValue);
                }
              }
              else if (fldType == "select") {
                //Set Body field
                //New code added
                if(prop=='parent' && fldValue){
                  	var parentId = CheckIfCustomerVendorExists(fldValue, sfAccountType);
                  	log.debug('parentId :',parentId);
                  	if(parentId){
                    	objCustomer.setValue(prop, parentId);
                  	}
                }//end
                else if (isNaN(fldValue)) {
                  objCustomer.setText(prop, fldValue);
                } else {
                  objCustomer.setValue(prop, fldValue);
                }
              }
              else {
                //Set Body field
                if (fldValue) {
                  	objCustomer.setValue(prop, fldValue);
                }
              }
            }
          } catch (ex) {
            log.error("Error setting field value - " + prop, ex.message);
          }
        }
      }//For Loop Ends

      /*
      var addressList = objCust.addressbook;
      var addressShipping = objCust.addressbookshipping;
      log.debug("addressList", JSON.stringify(addressList));
      log.debug("addressShipping", addressShipping);


      if (addressList && addressList.length > 0) {
        if (addressShipping) {
          if (addressShipping.length > 0) {
            addressList = addressList.concat(addressShipping);
          }
        }
      } else {
        if (addressShipping) {
          if (addressShipping.length > 0) {
            addressList = addressShipping;
          }
        }
      }
      log.debug("addressList", JSON.stringify(addressList));
      if (addressList) {
        var defaultBilling = "";
        if (addressList.length > 0) {
          for (var count = 0; count < addressList.length; ++count) {

            var addressbook = addressList[count];
            objCustomer.selectNewLine({
              sublistId: "addressbook"
            });
            var addSubRecord = objCustomer.getCurrentSublistSubrecord({
              sublistId: "addressbook",
              fieldId: "addressbookaddress"
            });

            for (var prop in addressbook) {

              fldType = "", fldValue = "";
              fldValue = addressbook[prop];
              log.debug("Prop - Prop Value - fldValue", prop + " - " + addressbook[prop] + " - " + fldValue);
              try {
                if (fldValue) {
                  //Don't set any field value, if parameter contains capital letter
                  if (library.InitialIsCapital(prop)) {
                    log.debug("Its a SF field, so no need to set field");
                    continue;
                  }

                  if (prop == "defaultbilling") {
                    defaultBilling = "T";
                    addSubRecord.setValue(prop, "T");
                    addSubRecord.setValue("defaultshipping", "F");
                    delete addressbook.defaultshipping;
                  }
                  //get Field Type
                  fldType = addSubRecord.getField({
                    //sublistId : "addressbook",
                    fieldId: prop
                  }).type;

                  //log.debug("Field type", fldType);
                  if (fldType == "date") {
                    //Set Body field
                    if (fldValue) {
                      var newDate = parseAndFormatDateString(fldValue);
                      log.debug("newDate", newDate);
                      addSubRecord.setValue(prop, newDate);
                      if (prop == "startdate") {
                        startDate = newDate;
                      }
                      if (prop == "enddate") {
                        endDate = newDate;
                      }
                    }
                  }
                  else if (fldType == "percent") {
                    //Set Body field
                    if (fldValue) {
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }
                  else if (fldType == "select") {
                    //Set Body field
                    if (isNaN(fldValue)) {
                      addSubRecord.setText(prop, fldValue);
                    } else {
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }
                  else {
                    //Set Body field
                    if (fldValue) {
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }
                }
              } catch (ex) {
                log.error("Error setting field value - " + prop, ex.message);
              }
            }//For Loop Ends
            if (!defaultBilling) {
              addSubRecord.setValue("defaultshipping", "T");
              addSubRecord.setValue("defaultbilling", "F");
            }
            objCustomer.commitLine({
              sublistId: "addressbook"
            });
            log.debug("Address", "Added");
          }
        }
      }
      */
      log.debug("objCustomer", JSON.stringify(objCustomer));

      try {
        log.debug('objCustomer', JSON.stringify(objCustomer));
        Add_Address(objCustomer);
        var recordId = objCustomer.save({
          enableSourcing: true,
          ignoreMandatoryFields: true
        });
        log.debug("New Customer/Vendor Record", recordId);
      } catch (ex5) {
        log.debug("Error in Creating New Customer/Vendor on save", ex5.message);
        log.debug("Error in Creating New Customer/Vendor code on save", ex5);

      }

      if (recordId) {

        log.debug("after adding New Customer/Vendor Record", recordId);
        response = "New customer/vendor created successfully in NetSuite: " + recordId;
      }

      //Add Currency

    } catch (ex4) {
      log.error("Error in Creating New Customer/Vendor", ex4.message);
      log.error("Error in Creating New Customer/Vendor code", ex4.code);

      customerErrMsg += "Error in create new Customer/Vendor record in NetSuite: " + ex4.message + ". \n";
      return "Error in Creating New Customer/Vendor" + ex4.message;
    }

    return response;

  }

  /*****************************************
      * Description: Get SF Account Details needs to be used to create Customer record in NS
      * Main Job of this function is to retrive Biiling & Shipping Address details of Customer from SF API call
      * @param: Salesforce Account ID {string}
      * @param: Customer info {Object}
      * @return: Customer info {Object}
      ******************************************/
  function GetSalesForceAccountDetails(extCustId, customerInfo) {
    try {
      var objCustInfo = null;
      var accessToken = "";
      var instanceUrl = "";

      if (customerInfo.addressbook) {
        delete customerInfo.addressbook;
      }

      //Get Access Token to call Sales force API
      var objTokenDetails = library.GetToken();
      if (objTokenDetails) {
        if (objTokenDetails.token) {
          accessToken = objTokenDetails.token;
        }
        if (objTokenDetails.url) {
          instanceUrl = objTokenDetails.url;
        }
      }
      log.debug("accessToken - instanceUrl", accessToken + " - " + instanceUrl);
      if (accessToken && instanceUrl) {
        //Setting up Headers 
        var headersArr = [];
        headersArr["Content-Type"] = "application/json";
        headersArr["Authorization"] = "Bearer " + accessToken;

        var response = null;
        if (instanceUrl) {

          //API to fetch only Address fields of Account
          instanceUrl = instanceUrl + "/services/data/v41.0/sobjects/Account/" + extCustId + "?fields=BillingAddress,ShippingAddress";

          //https Module
          if (instanceUrl.indexOf('https://') != -1) {
            response = https.get({
              url: instanceUrl,
              headers: headersArr
            });
          }
          //http Module
          else if (instanceUrl.indexOf('http://') != -1) {
            response = http.post({
              url: instanceUrl,
              headers: headersArr
            });
          }
        }
        if (response) {
          if (response.body) {
            var body = response.body;
            var respBody = JSON.parse(body);
            //log.debug('respBody', respBody);
            var arrAddress = new Array();

            if (respBody) {
              objCustInfo = new Object();
              if (customerInfo.custentity_external_id) {
                customerInfo.custentity_external_id = GetTruncatedCustomerExternalId(customerInfo.custentity_external_id);
              }
              //Add all customer body field information got from JSON in Customer Object
              objCustInfo = customerInfo;
              //delete objCustInfo.addressbook;
              log.debug('Body Fields of objCustInfo', objCustInfo);
              //Get response attributes
              var objAttributes = respBody;
              log.debug('Response from SF API Call', objAttributes);

              var fldMapSearch = search.create({
                type: "customrecord_ycs_sf_ns_field_mapping",
                columns: [
                  "custrecord_field_internalid_ns",
                  "custrecord_field_internalid_sf",
                  "custrecord_sublist_internalid_ns",
                  "custrecord_sf_sublist_id",
                  "internalid"
                ],
                filters: [
                  search.createFilter({
                    name: 'custrecord_record_type_ns',
                    operator: search.Operator.IS,
                    values: CUSTOMER_RECORD_ID
                  }),
                  search.createFilter({
                    name: 'custrecord_sublist_internalid_ns',
                    operator: search.Operator.IS,
                    values: "addressbook"
                  })
                ]
              });
              var arrMappingList = new Array();
              if (fldMapSearch) {
                fldMapSearch.run().each(function (result) {
                  var nsFld = result.getValue("custrecord_field_internalid_ns");
                  var sfFld = result.getValue("custrecord_field_internalid_sf");
                  var nsSublist = result.getValue("custrecord_sublist_internalid_ns");
                  var sfSublist = result.getValue("custrecord_sf_sublist_id");
                  //log.debug('nsFld - sfFld - nsSublist - sfSublist', nsFld +" - "+ sfFld +" - "+ nsSublist +" - "+ sfSublist);
                  arrMappingList.push({ "nsfield": nsFld, "sffield": sfFld, "nssublist": nsSublist, "sfsublist": sfSublist });
                  return true;
                });
              }
              log.debug("arrMappingList", JSON.stringify(arrMappingList));

              if (objAttributes.BillingAddress) {
                var billAddress = objAttributes.BillingAddress;
                var objAddress = new Object();

                //Fetch only objects where SF Sublist is "BillingAddress"
                var billAddGrp = arrMappingList.filter(function (a) {
                  return (a.sfsublist == "BillingAddress");
                }
                                                      );
                log.debug("billAddGrp", JSON.stringify(billAddGrp));

                //Set Address Object by using mapping field IDs
                for (var count = 0; count < billAddGrp.length; ++count) {
                  objAddress[billAddGrp[count].nsfield] = billAddress[billAddGrp[count].sffield];
                }
                objAddress.defaultbilling = "T";
                objAddress.defaultshipping = "F";
                arrAddress.push(objAddress);
              }
              if (objAttributes.ShippingAddress) {
                var shipAddress = objAttributes.ShippingAddress;
                var objAddress = new Object();

                //Fetch only objects where SF Sublist is "ShippingAddress"
                var shipAddGrp = arrMappingList.filter(function (a) {
                  return (a.sfsublist == "ShippingAddress");
                }
                                                      );
                log.debug("shipAddGrp", JSON.stringify(shipAddGrp));

                //Set Address Object by using mapping field IDs
                for (var count = 0; count < shipAddGrp.length; ++count) {
                  objAddress[shipAddGrp[count].nsfield] = shipAddress[shipAddGrp[count].sffield];
                }
                objAddress.defaultbilling = "F";
                objAddress.defaultshipping = "T";
                if (objAddress) {
                  arrAddress.push(objAddress);
                }
              }
              log.debug('arrAddress', arrAddress);

              //Add "addressbook" parameter if array has some value
              if (arrAddress && arrAddress.length > 0) {
                objCustInfo.addressbook = arrAddress;
              }
              log.debug('Final objCustInfo', objCustInfo);
            }
          }
        }
      }
      return objCustInfo;
    } catch (ex) {
      log.error("Error getting Salesforce Customer Information", ex.message);
      customerErrMsg += "Error getting Salesforce Customer Information: " + ex.message + "\n";
      return "";
    }
  }

  function UpdateCustomerVendor(oldCustomer, objCust) {
    try {
      var response = "";

      var sfAccountType = objCust.custentity_pppmi_sf_account_type;
      log.debug("sfAccountType update : ", sfAccountType);

      //Update Customer/Vendor

      var objCustomer = '';
      if (sfAccountType == 'Customer') {

        objCustomer = record.load({
          type: "customer",
          id: oldCustomer,
          isDynamic: true
        });
      } else {

        objCustomer = record.load({
          type: "vendor",
          id: oldCustomer,
          isDynamic: true
        });
      }

      //Set Body Fields
      for (var prop in objCust) {

        fldType = "", fldValue = "";
        fldValue = objCust[prop];
        log.debug("Prop - Prop Value - fldValue update : ", prop + " - " + objCust[prop] + " - " + fldValue);

        //Set Main field value
        if (prop != "addressbook") {
          try {
            if (fldValue) {
              //Don't set any field value, if parameter contains capital letter
              if (library.InitialIsCapital(prop)) {
                log.debug("Its a SF field, so no need to set field");
                continue;
              }

              //get Field Type
              fldType = objCustomer.getField({
                fieldId: prop
              }).type;

              log.debug("Field type update : ", fldType);
              if (fldType == "date") {
                //Set Body field
                if (fldValue) {
                  var newDate = parseAndFormatDateString(fldValue);
                  log.debug("newDate", newDate);
                  objCustomer.setValue(prop, newDate);
                  if (prop == "startdate") {
                    startDate = newDate;
                  }
                  if (prop == "enddate") {
                    endDate = newDate;
                  }
                }
              }
              else if (fldType == "percent") {
                //Set Body field
                if (fldValue) {
                  objCustomer.setValue(prop, fldValue);
                }
              }
              else if (fldType == "select") {
                //Set Body field
                //New code added
				if(prop=='parent'){
					var parentId = CheckIfCustomerVendorExists(fldValue, sfAccountType);
					log.debug('parentId update :',parentId);
					if(parentId){
						objCustomer.setValue(prop, parentId);
					}
				}//end
                else if (isNaN(fldValue)) {
                  objCustomer.setText(prop, fldValue);
                } else {
                  objCustomer.setValue(prop, fldValue);
                }
              }
              else {
                //Set Body field
                if (fldValue) {
                  objCustomer.setValue(prop, fldValue);
                }
              }
            }
          } catch (ex) {
            log.error("Error setting field value - " + prop, ex.message);
          }
        }
      }//For Loop Ends

      /*
      var addCount = objCustomer.getLineCount("addressbook");
      //Remove Address Lines
      var subCount = objCustomer.getLineCount("submachine");
      log.debug("subCount====", JSON.stringify(subCount));
      if (addCount > 0) {
        for (var line = addCount - 1; line >= 0; --line) {
          objCustomer.removeLine({
            sublistId: 'addressbook',
            line: line,
            ignoreRecalc: true
          });
        }
      }
      var addressList = objCust.addressbook;
      log.debug("addressList", JSON.stringify(addressList));
      if (addressList) {
        if (addressList.length > 0) {
          for (var count = 0; count < addressList.length; ++count) {

            var addressbook = addressList[count];
            objCustomer.selectNewLine({
              sublistId: "addressbook"
            });
            var addSubRecord = objCustomer.getCurrentSublistSubrecord({
              sublistId: "addressbook",
              fieldId: "addressbookaddress"
            });
            var fldType = "", fldValue = "";
            for (var prop in addressbook) {

              fldType = "", fldValue = "";
              fldValue = addressbook[prop];
              try {
                if (fldValue) {
                  //Don't set any field value, if parameter contains capital letter
                  if (library.InitialIsCapital(prop)) {
                    log.debug("Its a SF field, so no need to set field");
                    continue;
                  }

                  //get Field Type
                  fldType = addSubRecord.getField({
                    //sublistId : "addressbook",
                    fieldId: prop
                  }).type;
                  log.debug("Prop - Prop Type - fldValue", prop + " - " + fldType + " - " + fldValue);
                  //log.debug("Field type", fldType);
                  if (fldType == "date") {
                    //Set Body field
                    if (fldValue) {
                      var newDate = parseAndFormatDateString(fldValue);
                      log.debug("newDate", newDate);
                      addSubRecord.setValue(prop, newDate);
                      if (prop == "startdate") {
                        startDate = newDate;
                      }
                      if (prop == "enddate") {
                        endDate = newDate;
                      }
                    }
                  }
                  else if (fldType == "percent") {
                    //Set Body field
                    if (fldValue) {
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }
                  else if (fldType == "select") {
                    //Set Body field
                    if (isNaN(fldValue)) {
                      addSubRecord.setText(prop, fldValue);
                    } else {
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }
                  else {
                    //Set Body field
                    if (fldValue) {
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }
                }
              } catch (ex) {
                log.error("Error setting field value - " + prop, ex.message);
              }
            }//For Loop Ends
            objCustomer.commitLine({
              sublistId: "addressbook"
            });
            log.debug("Address", "Added");
          }
        }
      }
      */
      Add_Address(objCustomer);
      if (objCustomer.getValue('custentity_global_account_director__c')) {
        log.debug("objCustomer", 'SET SELES REP');
        objCustomer.setValue('salesrep', searchresource(objCustomer.getValue('custentity_global_account_director__c')));
      }
      var recordId = objCustomer.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
      });
      log.debug("Old customer/vendor updated", recordId);
      if (recordId) {
        response = "Existing customer/vendor updated successfully in NetSuite: " + recordId;
      }
      return response;
    } catch (ex5) {
      log.error("Error in Updating old customer/vendor", ex5.message);
      customerErrMsg += "Error in Updating existing customer/vendor: " + ex5.message + "\n";
      return "Error in Updating old customer/vendor" + ex5.message;
    }
  }

  function CheckIfCustomerVendorExists(sfCustId, sfAccountType) {
    var existCustomer = "";
    try {
      var trunCustId = GetTruncatedCustomerExternalId(sfCustId);
      var custSearch;
      var custSearchFilter = [];
      var custSearchColumn = [];

      custSearchFilter.push(search.createFilter({ name: "custentity_external_id", operator: search.Operator.IS, values: trunCustId }));
      custSearchColumn.push(search.createColumn({ name: "custentity_external_id", label: "External Id" }));
      custSearchColumn.push(search.createColumn({ name: "internalid", label: "Internal Id" }));

      if (sfAccountType == 'Customer') {
        custSearch = search.create({ type: "customer", filters: custSearchFilter, columns: custSearchColumn });
      } else {
        custSearch = search.create({ type: "vendor", filters: custSearchFilter, columns: custSearchColumn });
      }

      if (custSearch) {
        var custResults = custSearch.run().getRange({ start: 0, end: 10 });
        if (custResults) {
          var custResult = custResults[0];
          if (custResult) {
            existCustomer = custResult.getValue("internalid");
          }

        }
      }
      return existCustomer;
    } catch (ex2) {
      log.error("Error checking existing Customer/Vendor record", ex2.message);
      customerErrMsg += "Error checking if Customer/Vendor with SF ID already exists or not: " + ex2.message + "\n";
      return "";
    }
  }

  function Add_Address(objCustomer)
  {

    var ObjExitAddress=[];

    for(var v=0;v<objCustomer.getLineCount({sublistId: 'addressbook'});v++)
    {
      objCustomer.selectLine({
        sublistId: 'addressbook',
        line: v
      });
      var addSubRecord = objCustomer.getCurrentSublistSubrecord({
        sublistId : "addressbook",
        fieldId : "addressbookaddress"
      });
      ObjExitAddress.push(addSubRecord.getValue('addr1'));
    }


    // streel ship;pune;mh;in;412207
    var AddressObj=[];
    var ship_address=objCustomer.getValue('custentity_pppmi_sfdc_shipping_addr_cu');
    var bill_address=objCustomer.getValue('custentity_pppmi_sfdc_billing_address_cu');
    if(ship_address)
    {
      ship_address=ship_address.split(';');
      if(ship_address[0] && ObjExitAddress.indexOf(ship_address[0])==-1)
      {
        objCustomer.selectNewLine({
          sublistId: "addressbook"
        });
        objCustomer.setCurrentSublistValue({ sublistId: 'addressbook', fieldId: 'defaultshipping', value:true});
        objCustomer.setCurrentSublistValue({ sublistId: 'addressbook', fieldId: 'defaultbilling', value:false});
        var addSubRecord = objCustomer.getCurrentSublistSubrecord({
          sublistId : "addressbook",
          fieldId : "addressbookaddress"
        });
        addSubRecord.setValue('addr1', ship_address[0]);
        addSubRecord.setValue('city', ship_address[1]);
        addSubRecord.setValue('state', ship_address[2]);
        addSubRecord.setValue('zip', ship_address[4]);
        objCustomer.commitLine({
          sublistId : "addressbook"
        });
      }
    }
    if(bill_address)
    {
      bill_address=bill_address.split(';');
      if(bill_address[0] && ObjExitAddress.indexOf(bill_address[0])==-1)
      {


        objCustomer.selectNewLine({
          sublistId: "addressbook"
        });
        objCustomer.setCurrentSublistValue({ sublistId: 'addressbook', fieldId: 'defaultshipping', value:false});
        objCustomer.setCurrentSublistValue({ sublistId: 'addressbook', fieldId: 'defaultbilling', value:true});
        var addSubRecord = objCustomer.getCurrentSublistSubrecord({
          sublistId : "addressbook",
          fieldId : "addressbookaddress"
        });
        addSubRecord.setValue('addr1', bill_address[0]);
        addSubRecord.setValue('city', bill_address[1]);
        addSubRecord.setText('state', bill_address[2]);
        addSubRecord.setText('country', bill_address[3]);
        addSubRecord.setValue('zip', bill_address[4]);
        objCustomer.commitLine({
          sublistId : "addressbook"
        });
      }

    }

  }

  return {
    post: UpdateExistingCustomerInNetSuiteFromSF
  }
});




