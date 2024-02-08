/**
 * @NApiVersion 2.x
 * @NScriptType restlet
*/
define(['N/search', 'N/https', 'N/http', 'N/record', './YCS_Library'],
       function (search, https, http, record, library) {

  var TRIGGER_ON_CREATION = "On Record Creation";
  var CONTACT_RECORD_ID = "-6";
  var contactErrMsg = "";
  function UpdateContactFromSFToNS(context) {
    var response = "";
    try {
      contactErrMsg = "Script Execution Starts for Contact record update from Salesforce to NetSuite. \n";
      var startTime = new Date();
      log.debug("context", context);
      if (context) {
        //record Type
        var arrContactList = context.Contact;
        if (arrContactList && arrContactList.length > 0) {

          var objContact = arrContactList[0];
          var oldContact = "";

          //If record details object presents
          if (objContact) {
            log.debug("Contact Record Details", JSON.stringify(objContact));

            var sfContactId = objContact.custentity_external_id;
            log.debug("sfContactId", sfContactId);
            var sfContactType = objContact.custentity_pppmi_sf_account_type;
            log.debug("sfContactType", sfContactType);
            if (sfContactId) {

              //For existing Contact
              oldContact = CheckIfContactExists(sfContactId, sfContactType);
              log.debug("oldContact", oldContact);
              if (!oldContact) {
                response = CreateContact(objContact);
                //response = "Contact doesn't exists.";
              }
              else { //Contact record exists 
                response = UpdateContact(oldContact, objContact);
              }
            }
          }
        }
      }
      if (contactErrMsg) {
        //library.ErrorEmailLog(156,contactErrMsg);//As of now we are hard coding config id to 156
        //Write in Error Log File
        library.JSONFile(contactErrMsg, startTime, '');
      }
      return response;
    } catch (ex) {
      log.error("Error in Contact Restlet", ex.message);
      contactErrMsg += "Error in Updating Contact record for Sf ID " + sfContactId + " From SF to NetSuite: ";
      contactErrMsg += ex.message;
      contactErrMsg += '\n';
      //Write in Error Log File
      library.JSONFile(contactErrMsg, startTime, '');
      return "Error in Contact Restlet: " + ex.message;
    }
  }

  function CreateContact(objContactInfo) {
    try {
      var accountId = objContactInfo.company;	//	AccountId;
      log.debug("accountId", accountId);
      var sfContactType = objContactInfo.custentity_pppmi_sf_account_type;
      log.debug("sfContactType", sfContactType);

      if (accountId) {
        var customerId = CheckIfCustomerExists(accountId, sfContactType);
        log.debug("NetSuite customerId", customerId);
        if (customerId) {

          //Remove customer external field id from array of field id list
          delete objContactInfo.company;	//	AccountId;														
          delete objContactInfo.internalid;	
          //Create Contact Record
          var contactRec = record.create({
            type: "contact",
            isDynamic: true
          });
          objContactInfo.company = customerId;

          var fldType = "", fldValue = "", fldId = "";
          for (var prop in objContactInfo) {

            fldType = "", fldValue = "";
            fldValue = objContactInfo[prop];
            log.debug("Prop - Prop Value - fldValue", prop + " - " + objContactInfo[prop] + " - " + fldValue);
            //Set Main field value
            if (prop != "addressbook" && prop != "addressbookshipping") {
              try {

                //Don't set any field value, if parameter contains capital letter
                if (library.InitialIsCapital(prop)) {
                  log.debug("Its a SF field, so no need to set field");
                  continue;
                }

                //get Field Type
                fldType = contactRec.getField({
                  fieldId: prop
                }).type;

                //log.debug("Field type", fldType);
                if (fldType == "date") {

                  //Set Body field
                  if (fldValue) {
                    var newDate = parseAndFormatDateString(fldValue);
                    log.debug("newDate", newDate);
                    contactRec.setValue(prop, newDate);
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
                    contactRec.setValue(prop, fldValue);
                  }
                }
                else if (fldType == "select") {
                  //Set Body field
                  if (isNaN(fldValue)) {
                    contactRec.setText(prop, fldValue);
                  } else {
                    contactRec.setValue(prop, fldValue);
                  }
                }
                else {
                  //Set Body field
                  if (fldValue) {
                    contactRec.setValue(prop, fldValue);
                  }
                }
              } catch (ex) {
                log.error("Error setting field value", prop);
              }
            }
          }//For Loop Ends

          var addressList = objContactInfo.addressbook;
          log.debug("addressList", JSON.stringify(addressList));
          if (addressList) {
            var defaultBilling = "";
            if (addressList.length > 0) {
              for (var count = 0; count < addressList.length; ++count) {

                var addressbook = addressList[count];
                contactRec.selectNewLine({
                  sublistId: "addressbook"
                });
                var addSubRecord = contactRec.getCurrentSublistSubrecord({
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

                      /*
                                                if (prop == "defaultbilling") {
                                                    defaultBilling = "T";
                                                    addSubRecord.setValue(prop, "T");
                                                    addSubRecord.setValue("defaultshipping", "F");
                                                    delete addressbook.defaultshipping;
                                                }
                                                */
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
                /*
                                    if (!defaultBilling) {
                                        addSubRecord.setValue("defaultshipping", "T");
                                        addSubRecord.setValue("defaultbilling", "F");
                                    }
                                    */
                contactRec.commitLine({
                  sublistId: "addressbook"
                });
                log.debug("Address", "Added");
              }
            }
          }
          if(sfContactType){

            contactRec.setValue({
              fieldId : 'parentcompany', 
              value: customerId
            });


            /*  contactRec.selectNewLine({
                            sublistId: "relationships"
                        });

                        contactRec.setCurrentSublistValue({
                            sublistId: 'relationships',
                            fieldId: 'parentcompany',
                            value: customerId
                        });

                        contactRec.commitLine({
                            sublistId: 'relationships'
                        });*/
          }

          log.debug("contactRec", JSON.stringify(contactRec));
          var recordId = contactRec.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
          });
          log.debug("New Contact Record", recordId);
        } else {
          log.debug("Contact record can't be created as Customer record attached to this Contact record in not yet present in NetSuite Account.")
        }
      }
    } catch (ex1) {
      log.error("Error in create Contact record", ex1.message);
      contactErrMsg += "Error in create Contact record: " + ex1.message + ". \n";
    }
  }
  function GetTruncatedCustomerExternalId(sfCustId) {
    try {
      if (sfCustId.length == 18) {
        sfCustId = sfCustId.slice(0, -3);
      }
      return sfCustId;
    } catch (ex) {
      log.error("Error getting truncated Customer External ID", ex.message);
      errMsg += "Error getting truncated Customer External ID: " + ex.message + "\n";
      return "";
    }
  }
  function CheckIfCustomerExists(sfCustId, sfContactType) {
    var existCustomer = "";
    try {
      var custSearch;
      var custSearchFilter = [];
      var custSearchColumn = [];

      var truncCustId = sfCustId;	//	GetTruncatedCustomerExternalId(sfCustId);

      custSearchFilter.push(search.createFilter({ name: "custentity_external_id", operator: search.Operator.IS, values: truncCustId }));
      custSearchColumn.push(search.createColumn({ name: "custentity_external_id", label: "External Id" }));
      custSearchColumn.push(search.createColumn({ name: "internalid", label: "Internal Id" }));


      if (sfContactType == 'Customer') {
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
      log.error("Error checking existing Customer record", ex2.message);
      contactErrMsg += "Error checking if Customer with SF ID already exists or not: " + ex2.message + "\n";
      return "";
    }
  }

  function GetContactWithAddress(objContactInfo) {
    try {
      var accessToken = "", instanceUrl = "", extContactId = "", nsContactId = "";
      var objContact;
      extContactId = objContactInfo.custentity_external_id;
      if (extContactId) {
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
            //instanceUrl = instanceUrl+"/services/data/v41.0/sobjects/Contact/" + extContactId

            //API to fetch only Address fields of Contact
            instanceUrl = instanceUrl + "/services/data/v41.0/sobjects/Contact/" + extContactId + "?fields=MailingAddress";
            log.debug("1. Before sending request to SF", instanceUrl);

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
            //log.debug('response', JSON.stringify(response));
            if (response.body) {
              var body = response.body;
              //log.debug('response.body', body);
              var respBody = JSON.parse(body);
              log.debug('respBody', respBody);
              var arrAddress = new Array();

              if (respBody) {
                objContact = new Object();
                //Add all customer body field information got from JSON in Customer Object
                objContact = objContactInfo;
                log.debug('Body Fields of objContact', objContact);
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
                      values: CONTACT_RECORD_ID
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

                if (objAttributes.MailingAddress) {
                  var billAddress = objAttributes.MailingAddress;
                  var objAddress = new Object();

                  //Fetch only objects where SF Sublist is "MailingAddress"
                  var billAddGrp = arrMappingList.filter(function (a) {
                    return (a.sfsublist == "MailingAddress");
                  });
                  log.debug("MailAddGrp", JSON.stringify(billAddGrp));

                  //Set Address Object by using mapping field IDs
                  for (var count = 0; count < billAddGrp.length; ++count) {
                    objAddress[billAddGrp[count].nsfield] = billAddress[billAddGrp[count].sffield];
                  }
                  //objAddress.defaultbilling = "F";
                  //objAddress.defaultshipping = "T";
                  arrAddress.push(objAddress);
                }

                objContact.addressbook = arrAddress;
                //log.debug('Final objContact', objContact);
              }
            }
          }
        }
      }

      if (!objContact) {
        objContact = objContactInfo
      }
      return objContact;
    }
    catch (ex) {
      log.error("Error getting Contact record details with Address details before update", ex.message);
      contactErrMsg += "Error getting Contact record details with Address details before update: " + ex.message + ". \n";
      return "";
    }
  }

  function UpdateContact(oldContact, objContactInfo) {
    try {
      var objContactDetails = GetContactWithAddress(objContactInfo);
      log.debug("objContactDetails", JSON.stringify(objContactDetails));
      var response = "";
      //Create Customer
      var contactRec = record.load({
        type: "contact",
        id: oldContact,
        isDynamic: true
      });
      var fldType = "", fldValue = "", fldId = "";
      for (var prop in objContactDetails) {
        if (prop != "addressbook") {
          fldType = "", fldValue = "";
          fldValue = objContactDetails[prop];
          log.debug("Prop - Prop Value - fldValue", prop + " - " + objContactDetails[prop] + " - " + fldValue);

          try {
            //Don't set any field value, if parameter contains capital letter
            if (library.InitialIsCapital(prop)) {
              log.debug("Its a SF field, so no need to set field");
              continue;
            }

            //get Field Type
            fldType = contactRec.getField({
              fieldId: prop
            }).type;

            //log.debug("Field type", fldType);
            if (fldType == "date") {

              //Set Body field
              if (fldValue) {
                var newDate = parseAndFormatDateString(fldValue);
                log.debug("newDate", newDate);
                contactRec.setValue(prop, newDate);
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
                contactRec.setValue(prop, fldValue);
              }
            }
            else if (fldType == "select") {
              //Set Body field
              if (isNaN(fldValue)) {
                contactRec.setText(prop, fldValue);
              } else {
                contactRec.setValue(prop, fldValue);
              }
            }
            else {
              //Set Body field
              if (fldValue) {
                contactRec.setValue(prop, fldValue);
              }
            }
          } catch (ex) {
            log.error("Error setting field value", prop);
          }
        }
      }//For Loop Ends

      //Remove Address Lines
      var addCount = contactRec.getLineCount("addressbook");
      if (addCount > 0) {
        for (var line = addCount - 1; line >= 0; --line) {
          contactRec.removeLine({
            sublistId: 'addressbook',
            line: line,
            ignoreRecalc: true
          });
        }
      }

      var addressList = objContactDetails.addressbook;
      var addressShipping = objContactDetails.addressbookshipping;
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
            contactRec.selectNewLine({
              sublistId: "addressbook"
            });
            var addSubRecord = contactRec.getCurrentSublistSubrecord({
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

                  /*
                  if (prop == "defaultbilling") {
                    defaultBilling = "T";
                    addSubRecord.setValue(prop, "T");
                    addSubRecord.setValue("defaultshipping", "F");
                    delete addressbook.defaultshipping;
                  }
                  */
                  //get Field Type
                  fldType = addSubRecord.getField({ fieldId: prop }).type;

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
            /*
            if (!defaultBilling) {
              addSubRecord.setValue("defaultshipping", "T");
              addSubRecord.setValue("defaultbilling", "F");
            }
            */
            contactRec.commitLine({
              sublistId: "addressbook"
            });
            log.debug("Address", "Added");
          }
        }
      }

      var recordId = contactRec.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
      });
      log.debug("Old Contact updated", recordId);
      if (recordId) {
        //response = "Existing Contact updated successfully in NetSuite: " + recordId;
        log.debug("Existing Contact updated successfully in NetSuite: ", recordId)
      }
      return response;
    } catch (ex5) {
      log.error("Error in Updating old Contact", ex5.message);
      contactErrMsg += "Error in updating old Contact record: " + ex5.message + ". \n";
      return "Error in Updating old Contact: " + ex5.message;
    }
  }

  function CheckIfContactExists(sfContId, sfContactType) {
    var existContact = "";
    try {
      var custSearch = search.create({
        type: "contact",
        columns: [
          "custentity_external_id",
          "internalid"
        ],
        filters: [
          search.createFilter({
            name: 'custentity_external_id',
            operator: search.Operator.IS,
            values: sfContId
          }),
          search.createFilter({
            name: 'custentity_pppmi_sf_account_type',
            operator: search.Operator.IS,
            values: sfContactType
          })
        ]
      });
      if (custSearch) {
        var custResults = custSearch.run().getRange({ start: 0, end: 10 });
        if (custResults) {
          var custResult = custResults[0];
          if (custResult) {
            existContact = custResult.getValue("internalid");
          }

        }
      }
      return existContact;
    } catch (ex2) {
      log.error("Error checking existing Contact record", ex2.message);
      contactErrMsg += "Error checking existing Contact record: " + ex2.message + ". \n";
      return "";
    }
  }

  return {
    post: UpdateContactFromSFToNS
  }
});




