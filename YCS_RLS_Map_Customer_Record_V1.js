/**
 * @NApiVersion 2.x
 * @NScriptType restlet
*/
define(['N/search', 'N/https', 'N/http','N/record', './YCS_Library'], 
       function(search, https, http, record, library) {

  var TRIGGER_ON_CREATION = "On Record Creation";
  var CUSTOMER_RECORD_ID = "-2";
  var customerErrMsg = "";
  function UpdateExistingCustomerInNetSuiteFromSF(context){
    var response = "";
    try{
      var startTime = new Date();
      customerErrMsg = "Script Execution Starts for Customer record update from Salesforce to NetSuite. \n";
      log.debug("context", context);
      if(context){
        //context = context.toString().replace(/\t/g, '');//new added
        //record Type
        var arrCustList = context.Customer;

        if(arrCustList && arrCustList.length > 0){
          var objCust = arrCustList[0];

          var oldCustomer = "";

          //If record details object presents
          if(objCust){
            log.debug("Customer Record Details", JSON.stringify(objCust));

            var sfAccountId = objCust.custentity_external_id;
            log.debug("sfAccountId", sfAccountId);	
            if(sfAccountId){
              sfAccountId = GetTruncatedCustomerExternalId(sfAccountId);
              log.debug("Truncated sfAccountId", sfAccountId);
              //For existing customer
              oldCustomer = CheckIfCustomerExists(sfAccountId);
              log.debug("oldCustomer", oldCustomer);

              //Get Customer SF information including Address details
              var objCustomerInfo =objCust;  // comment by pankaj no need addres  // GetSalesForceAccountDetails(sfAccountId, objCust);
              log.debug("objCustomerInfo before Create/Update", objCustomerInfo);
              if(!oldCustomer){

                response = CreateCustomer(objCustomerInfo);								
              }
              else{ //Customer record exists 

                response = UpdateCustomer(oldCustomer, objCustomerInfo);
              }
            }
          }				
        }
      }
      if(customerErrMsg){					
        //library.ErrorEmailLog(156,customerErrMsg);//As of now we are hard coding config id to 156
        //Write in Error Log File
        library.JSONFile(customerErrMsg, startTime,''); 						
      }
      return response;
    }catch(ex){
      log.error("Error in Customer RESTLet", ex.message);
      customerErrMsg += "Error in Updating Customer record for Sf ID " + sfAccountId + " From SF to NetSuite: ";
      customerErrMsg += ex.message;
      customerErrMsg += '\n';
      //Write in Error Log File
      library.JSONFile(customerErrMsg, startTime, '');
      return "Customer record couldn't be updated due to this error; " + ex.message;
    }
  }

  function searchresource(emailid)
  {

    var GetEmpObj="";
    try
    {
      var employeeSearchObj = search.create({
        type: "employee",
        filters:
        [
          ["email","is",emailid],
          "AND", 
          ["isinactive","is","F"], 
          "AND", 
          ["salesrep","is","T"]
        ]
      });
      var searchResultCount = employeeSearchObj.runPaged().count;
      log.debug("employeeSearchObj result count",searchResultCount);
      employeeSearchObj.run().each(function(result){
        GetEmpObj=result.id;
        return false;
      });


    }
    catch(ex1)
    {

      log.error("employeeSearchObj result count",ex1);

    }
    return GetEmpObj;
  }

  function GetTruncatedCustomerExternalId(sfCustId){
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

  function CreateCustomer(objCust)
  {
    try{
      var response = "";
      //Create Customer

      log.debug("Step1-");

      var objCustomer = record.create({
        type: "customer",
        isDynamic: true
      });

      log.debug("Step2-");

      /*
      var entitySetupSearchObj = search.create({
        type: 'customrecord_ycs_entity_objectsetup',
        filters : [
          search.createFilter({
            name: 'custrecord_ns_entity_type',
            operator: search.Operator.ANYOF,
            values: CUSTOMER_RECORD_ID
          }),
          search.createFilter({
            name: 'isinactive',
            operator: search.Operator.IS,
            values: 'F'
          })   							
        ],
        columns : [	
                    "internalid", 
                //   "custrecord_ns_entity_type", 
                //   "custrecord_sf_entity_rec_type", 
                //   "custrecord_default_subsidiary",
                 //  "custrecord_default_customer_form",
                  // "custrecord_ns_entity_subsidiary",
                  ]
      });	
      log.debug("Step3-");
      var subsidiary = "", customForm = "", multisub="";
      var objSetup = new Object();
      if(entitySetupSearchObj){
        var setupResults = entitySetupSearchObj.run().getRange({start: 0,end: 1});
        log.debug("setupResults", JSON.stringify(setupResults));
        if(setupResults){

          //Contains setup object to hold default values while creating records
          subsidiary = setupResults[0].getValue("custrecord_default_subsidiary");
          customForm = setupResults[0].getValue("custrecord_default_customer_form");
          multisub = setupResults[0].getValue("custrecord_ns_entity_subsidiary");
          log.debug("multisub - multisub", multisub +" - "+ multisub);
          log.debug("subsidiary - customForm", subsidiary +" - "+ customForm);
        }
      }
      */
      var subsidiary = "", customForm = "", multisub="",multicurrency="",isPerson=false;
      var objSetup = new Object();
      var customrecord_ycs_entity_objectsetupSearchObj = search.create({
        type: "customrecord_ycs_entity_objectsetup",
        filters:
        [
          search.createFilter({
            name: 'custrecord_ns_entity_type',
            operator: search.Operator.ANYOF,
            values: CUSTOMER_RECORD_ID
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
          "custrecord_is_person",
          "custrecord_ns_entity_subsidiary",
          "custrecord_ycs_currency"

        ]
      });
      var searchResultCount = customrecord_ycs_entity_objectsetupSearchObj.runPaged().count;
      log.debug("customrecord_ycs_entity_objectsetupSearchObj result count",searchResultCount);
      customrecord_ycs_entity_objectsetupSearchObj.run().each(function(result){
        subsidiary = result.getValue("custrecord_default_subsidiary");
        customForm = result.getValue("custrecord_default_customer_form");
        isPerson = result.getValue("custrecord_is_person")==true?'T':'F';//new
        log.debug('isPerson : ',isPerson);
        multisub = result.getValue("custrecord_ns_entity_subsidiary");
        multicurrency=result.getValue("custrecord_ycs_currency");
        return false;
      });

      //log.debug("Step4-");
      objCustomer.setValue("subsidiary", subsidiary);
      objCustomer.setValue("customform", customForm);
      //objCustomer.setValue("isperson", "F");
      objCustomer.setValue("isperson", isPerson);
      objCustomer.setValue("pricelevel", "1");
      //var arrCustMainFlds = Object.getOwnPropertyNames(objCust);
      //log.debug("arrCustMainFlds in CreateCustomer()", arrCustMainFlds);

      var fldType = "", fldValue = "", fldId = "";
      for(var prop in objCust) {

        fldType = "", fldValue = "";
        fldValue = objCust[prop];
        if(fldValue){
          	fldValue = String(fldValue).replace(/#doublequote/g,'"');
          	fldValue = String(fldValue).replace(/#slash/g,'"');
        	//log.debug('fldValue 1 : ',fldValue);
        }
        log.debug("Prop - Prop Value - fldValue", prop + " - " + objCust[prop] + " - " + fldValue);  

        //Set Main field value
        if(prop != "addressbook" && prop != "addressbookshipping"){
          try{	
            if(fldValue){
              //Don't set any field value, if parameter contains capital letter
              if(library.InitialIsCapital(prop)){
                log.debug("Its a SF field, so no need to set field");
                continue;
              }									

              //get Field Type
              fldType = objCustomer.getField({
                fieldId: prop
              }).type;

              log.debug("Field type", fldType);
              if(fldType == "date"){
                //Set Body field
                if(fldValue){	
                  var newDate = parseAndFormatDateString(fldValue);
                  log.debug("newDate", newDate);
                  objCustomer.setValue(prop, newDate);
                  if(prop == "startdate"){
                    startDate = newDate;
                  }
                  if(prop == "enddate"){
                    endDate = newDate;
                  }
                }
              }
              else if(fldType == "percent"){
                //Set Body field
                if(fldValue){	
                  objCustomer.setValue(prop, fldValue);
                }
              }
              else if(fldType == "select"){
                //Set Body field
                if(isNaN(fldValue)){
                  objCustomer.setText(prop, fldValue);
                }else{
                  objCustomer.setValue(prop, fldValue);
                }
              }	
              else{
                //Set Body field
                if(fldValue){	
                  objCustomer.setValue(prop, fldValue);
                }
              }
            }													
          }catch(ex){
            log.error("Error setting field value - " + prop, ex.message);
          }						
        }
      }//For Loop Ends

      	//Add customer billing address
		var billingAdd = objCust.custentity_ycs_sfdc_bill_add;
      	if(billingAdd){
          	billingAdd = String(billingAdd).replace(/#doublequote/g,'"');
          	billingAdd = String(billingAdd).replace(/#slash/g,'"');
        	//log.debug('fldValue 1 : ',fldValue);
        }
		log.debug('billingAdd : ',billingAdd);
		if(billingAdd){

			billingAdd = billingAdd.split(';');
          	log.debug('billingAdd : ',billingAdd);
          	var billingAddStr = billingAdd[1];
			log.debug('billingAddStr : ',billingAddStr);
          	var billingAdd1 = String(billingAddStr).split('#enter');
            log.debug('billingAdd1.length 0 : ',billingAdd1.length);
          	var bAdd1 = '', bAdd2 = '';
            if(billingAdd1.length>1){
              //log.debug('case1');
          	  bAdd1 	= String(billingAdd1[0]).trim() || "";
          	  bAdd2 	= String(billingAdd1[1]).trim() || "";
            }else if(billingAdd1.length==1){
              //log.debug('case2');
              bAdd1 	= String(billingAdd1[0]).trim() || "";
              bAdd2     = '';
            }
          	log.debug('bAdd1 && bAdd2 : ',bAdd1+' && '+bAdd2);

			// Create the subrecord.
			objCustomer.selectNewLine({
              sublistId : "addressbook"
            });
            var billingSubRec = objCustomer.getCurrentSublistSubrecord({
              sublistId : "addressbook",
              fieldId : "addressbookaddress"
            });

			// Set values on the subrecord.
			// Set country field first when script uses dynamic mode
			billingSubRec.setValue({
				fieldId: 'country',
				value: billingAdd[4]=="United States" ? "US" : billingAdd[4]
			});

			billingSubRec.setValue({
				fieldId: 'city',
				value: billingAdd[2]
			});

			billingSubRec.setValue({
				fieldId: 'state',
				value: billingAdd[3]
			});

			billingSubRec.setValue({
				fieldId: 'zip',
				value: billingAdd[5]
			});

			billingSubRec.setValue({
				fieldId: 'addr1',
				value: bAdd1//billingAdd[1]
			});

          	billingSubRec.setValue({
				fieldId: 'addr2',
				value: bAdd2
			});

			billingSubRec.setValue({
				fieldId: 'addressee',
				value: billingAdd[0]
			});
          	billingSubRec.setValue({
				fieldId: 'attention',
				value: billingAdd[7]
			});

			if(billingAdd[6])
			billingSubRec.setValue({
				fieldId: 'addrphone',
				value: billingAdd[6]
			});

          	objCustomer.setCurrentSublistValue({sublistId : "addressbook",fieldId:"defaultbilling",value:true});
        	objCustomer.setCurrentSublistValue({sublistId : "addressbook",fieldId:"defaultshipping",value:false});

			objCustomer.commitLine({
              sublistId : "addressbook"
            });
            log.debug("Billing Address", "Added");
		}
	    //End Billing address

		//Add customer shipping address
		var shippingAdd = objCust.custentity_ycs_sfdc_ship_add;
      	if(billingAdd){
          	shippingAdd = String(shippingAdd).replace(/#doublequote/g,'"');
          	shippingAdd = String(shippingAdd).replace(/#slash/g,'"');
        	//log.debug('fldValue 1 : ',fldValue);
        }
		log.debug('shippingAdd : ',shippingAdd);
		if(shippingAdd){

			shippingAdd = shippingAdd.split(';');
          	log.debug('shippingAdd : ',shippingAdd);
          	var shippingAddStr = shippingAdd[1];
			log.debug('shippingAddStr : ',shippingAddStr);
          	var shippingAdd1 = String(shippingAddStr).split('#enter');
            var sAdd1 = '';
            for(var s=0; s < shippingAdd1.length; s++){
                if(s==0){
                    sAdd1 = shippingAdd1[s];
                }else{
                    sAdd1 = sAdd1 +' , '+shippingAdd1[s];
                }
            }
          	//var sAdd1 	= String(shippingAdd1[0]).trim();
          	//var sAdd2 	= String(shippingAdd1[1]).trim();
          	log.debug('sAdd1 : ',sAdd1);
            var shippingAddStr2 = shippingAdd[2];
			log.debug('shippingAddStr2 : ',shippingAddStr2);
          	var shippingAdd2 = String(shippingAddStr2).split('#enter');
            var sAdd2 = '';
            for(var s=0; s < shippingAdd2.length; s++){
                if(s==0){
                    sAdd2 = shippingAdd2[s];
                }else{
                    sAdd2 = sAdd2 +' , '+shippingAdd2[s];
                }
            }
            log.debug('sAdd2 : ',sAdd2);

			// Create the subrecord.
			objCustomer.selectNewLine({
              sublistId : "addressbook"
            });
            var shippingSubRec = objCustomer.getCurrentSublistSubrecord({
              sublistId : "addressbook",
              fieldId : "addressbookaddress"
            });

			// Set values on the subrecord.
			// Set country field first when script uses dynamic mode
			shippingSubRec.setValue({
				fieldId: 'country',
				value: shippingAdd[5]=="United States" ? "US" : shippingAdd[5]
			});

			shippingSubRec.setValue({
				fieldId: 'city',
				value: shippingAdd[3]
			});

			shippingSubRec.setValue({
				fieldId: 'state',
				value: shippingAdd[4]
			});

			shippingSubRec.setValue({
				fieldId: 'zip',
				value: shippingAdd[6]
			});

			shippingSubRec.setValue({
				fieldId: 'addr1',
				value: sAdd1
			});

          	shippingSubRec.setValue({
				fieldId: 'addr2',
				value: sAdd2
			});

			shippingSubRec.setValue({
				fieldId: 'addressee',
				value: shippingAdd[0]
			});

          	shippingSubRec.setValue({
				fieldId: 'attention',
				value: String(shippingAdd[8]).trim()
			});

			if(shippingAdd[6])
			shippingSubRec.setValue({
				fieldId: 'addrphone',
				value: shippingAdd[7]
			});

          	objCustomer.setCurrentSublistValue({sublistId : "addressbook",fieldId:"defaultbilling",value:false});
        	objCustomer.setCurrentSublistValue({sublistId : "addressbook",fieldId:"defaultshipping",value:true});

			objCustomer.commitLine({
              sublistId : "addressbook"
            });
            log.debug("Shipping Address", "Added");
		}
		//End Shipping address

      var addressList = objCust.addressbook;
      var addressShipping = objCust.addressbookshipping;
      if(addressList && addressList.length > 0){
        if(addressShipping){
          if(addressShipping.length > 0){
            addressList = addressList.concat(addressShipping);
          }
        }
      }else{
        if(addressShipping){
          if(addressShipping.length > 0){
            addressList = addressShipping;
          }
        }
      }
      log.debug("addressList", JSON.stringify(addressList));
      if(addressList){
        var defaultBilling = "";
        if(addressList.length > 0){
          for(var count = 0; count < addressList.length; ++count){

            var addressbook = addressList[count];
            objCustomer.selectNewLine({
              sublistId : "addressbook"
            });
            var addSubRecord = objCustomer.getCurrentSublistSubrecord({
              sublistId : "addressbook",
              fieldId : "addressbookaddress"
            });

            for(var prop in addressbook) {

              fldType = "", fldValue = "";
              fldValue = addressbook[prop];
              log.debug("Prop - Prop Value - fldValue", prop + " - " + addressbook[prop] + " - " + fldValue);  
              try{
                if(fldValue){
                  //Don't set any field value, if parameter contains capital letter
                  if(library.InitialIsCapital(prop)){
                    log.debug("Its a SF field, so no need to set field");
                    continue;
                  }									

                  if(prop == "defaultbilling"){
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
                  if(fldType == "date"){
                    //Set Body field
                    if(fldValue){	
                      var newDate = parseAndFormatDateString(fldValue);
                      log.debug("newDate", newDate);
                      addSubRecord.setValue(prop, newDate);
                      if(prop == "startdate"){
                        startDate = newDate;
                      }
                      if(prop == "enddate"){
                        endDate = newDate;
                      }
                    }
                  }
                  else if(fldType == "percent"){
                    //Set Body field
                    if(fldValue){	
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }
                  else if(fldType == "select"){
                    //Set Body field
                    if(isNaN(fldValue)){
                      addSubRecord.setText(prop, fldValue);
                    }else{
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }	
                  else{
                    //Set Body field
                    if(fldValue){	
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }
                }													
              }catch(ex){
                log.error("Error setting field value - " + prop, ex.message);
              }						
            }//For Loop Ends
            if(!defaultBilling){
              addSubRecord.setValue("defaultshipping", "T");
              addSubRecord.setValue("defaultbilling", "F");
            }
            objCustomer.commitLine({
              sublistId : "addressbook"
            });
            log.debug("Address", "Added");
          }
        }
      }							
      log.debug("objCustomer", JSON.stringify(objCustomer));

      if(objCustomer.getValue('custentity_global_account_director__c'))
      {
        log.debug("objCustomer", 'SET SELES REP');
        objCustomer.setValue('salesrep', searchresource(objCustomer.getValue('custentity_global_account_director__c'))); 
      }
      var recordId = objCustomer.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
      });
      log.debug("New Customer Record", recordId);				

      if(recordId)
      {
        var i_split=multisub.toString().split("-")
        log.debug("i_split", i_split);

        var i_split_new=i_split[0].toString().split(",")
        log.debug("i_split_new", i_split_new.length);
        if(i_split_new.length>0)
        {
          for(var z=0;z<i_split_new.length;z++)
          {
            try
            {
              var sub_id=i_split_new[z];
              if(subsidiary!=sub_id)
              {
                log.debug("sub_id#################", sub_id);
                var objCustomer_sub= record.create({
                  type: "customersubsidiaryrelationship",
                  isDynamic: true
                });
                objCustomer_sub.setValue('entity',recordId)
                objCustomer_sub.setValue('subsidiary',sub_id)
                var objCustomer_sub_id = objCustomer_sub.save({
                  enableSourcing: true,
                  ignoreMandatoryFields: true
                });
                log.debug("objCustomer_sub_id***********************", objCustomer_sub_id);	
              }
            }
            catch(er){}
          }
        }

        log.debug("after adding New Customer Record", recordId);		
        response = "New customer created successfully in NetSuite: " + recordId;
      }

      try
      {
        if(recordId && multicurrency)
        {
          var i_split=multicurrency.toString().split("-")
          log.debug("i_split", i_split);

          var i_split_new=i_split[0].toString().split(",")
          log.debug("i_split_new", i_split_new.length);
          if(i_split_new.length>0)
          {
            var objCustomer = record.load({
              type: "customer",
              id: recordId,
              isDynamic: true
            });
            var getCurr=objCustomer.getValue('currency');
            for(var z=0;z<i_split_new.length;z++)
            {

              var curr_id=i_split_new[z];
              if(curr_id!=getCurr)
              {
                objCustomer.selectNewLine({
                  sublistId : "currency"
                });
                objCustomer.setCurrentSublistValue({
                  sublistId : "currency",
                  fieldId : "currency",
                  value:curr_id
                });
                objCustomer.commitLine({"sublistId": "currency"});
              }
            }
            objCustomer.save({
              enableSourcing: true,
              ignoreMandatoryFields: true
            });

          }
        }
      }
      catch(er){

      }

      //Add Currency












      return response;
    }catch(ex4){
      log.error("Error in Creating New Customer", ex4.message);
      customerErrMsg += "Error in create new Customer record in NetSuite: " + ex4.message + ". \n";
      return "Error in Creating New Customer" + ex4.message;
    }
  }

  /*****************************************
		* Description: Get SF Account Details needs to be used to create Customer record in NS
		* Main Job of this function is to retrive Biiling & Shipping Address details of Customer from SF API call
		* @param: Salesforce Account ID {string}
		* @param: Customer info {Object}
		* @return: Customer info {Object}
		******************************************/
  function GetSalesForceAccountDetails(extCustId, customerInfo){
    try{
      var objCustInfo = null;
      var accessToken = "";
      var instanceUrl = "";

      if(customerInfo.addressbook){
        delete customerInfo.addressbook;
      }

      //Get Access Token to call Sales force API
      var objTokenDetails = library.GetToken();
      if(objTokenDetails){
        if(objTokenDetails.token){
          accessToken = objTokenDetails.token;
        }
        if(objTokenDetails.url){
          instanceUrl = objTokenDetails.url;
        }
      }
      log.debug("accessToken - instanceUrl", accessToken + " - " + instanceUrl);
      if(accessToken && instanceUrl){
        //Setting up Headers 
        var headersArr = [];
        headersArr["Content-Type"] = "application/json";
        headersArr["Authorization"] = "Bearer " + accessToken;

        var response = null;
        if(instanceUrl){				

          //API to fetch only Address fields of Account
          instanceUrl = instanceUrl+"/services/data/v41.0/sobjects/Account/" + extCustId+"?fields=BillingAddress,ShippingAddress";

          //https Module
          if(instanceUrl.indexOf('https://') != -1){
            response = https.get({
              url:instanceUrl,
              headers:headersArr
            });
          }
          //http Module
          else if(instanceUrl.indexOf('http://') != -1){
            response = http.post({
              url:instanceUrl,
              headers:headersArr
            });
          }
        }
        if(response){
          if(response.body){
            var body = response.body;
            var respBody = JSON.parse(body);
            //log.debug('respBody', respBody);
            var arrAddress = new Array();

            if(respBody){
              objCustInfo = new Object();
              if(customerInfo.custentity_external_id){
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
              if(fldMapSearch){
                fldMapSearch.run().each(function(result) {
                  var nsFld = result.getValue("custrecord_field_internalid_ns");
                  var sfFld = result.getValue("custrecord_field_internalid_sf");
                  var nsSublist = result.getValue("custrecord_sublist_internalid_ns");
                  var sfSublist = result.getValue("custrecord_sf_sublist_id");
                  //log.debug('nsFld - sfFld - nsSublist - sfSublist', nsFld +" - "+ sfFld +" - "+ nsSublist +" - "+ sfSublist);
                  arrMappingList.push({"nsfield": nsFld, "sffield": sfFld, "nssublist": nsSublist, "sfsublist": sfSublist});
                  return true;
                });
              }
              log.debug("arrMappingList", JSON.stringify(arrMappingList));

              if(objAttributes.BillingAddress){
                var billAddress = objAttributes.BillingAddress;
                var objAddress = new Object();

                //Fetch only objects where SF Sublist is "BillingAddress"
                var billAddGrp = arrMappingList.filter(function(a) { 
                  return(a.sfsublist == "BillingAddress");
                }
                                                      );
                log.debug("billAddGrp", JSON.stringify(billAddGrp));

                //Set Address Object by using mapping field IDs
                for(var count = 0; count < billAddGrp.length; ++count){
                  objAddress[billAddGrp[count].nsfield] = billAddress[billAddGrp[count].sffield];
                }
                objAddress.defaultbilling = "T";
                objAddress.defaultshipping = "F";
                arrAddress.push(objAddress);
              }
              if(objAttributes.ShippingAddress){
                var shipAddress = objAttributes.ShippingAddress;
                var objAddress = new Object();

                //Fetch only objects where SF Sublist is "ShippingAddress"
                var shipAddGrp = arrMappingList.filter(function(a) { 
                  return(a.sfsublist == "ShippingAddress");
                }
                                                      );
                log.debug("shipAddGrp", JSON.stringify(shipAddGrp));

                //Set Address Object by using mapping field IDs
                for(var count = 0; count < shipAddGrp.length; ++count){
                  objAddress[shipAddGrp[count].nsfield] = shipAddress[shipAddGrp[count].sffield];
                }
                objAddress.defaultbilling = "F";
                objAddress.defaultshipping = "T";
                if(objAddress){
                  arrAddress.push(objAddress);
                }									
              }
              log.debug('arrAddress', arrAddress);

              //Add "addressbook" parameter if array has some value
              if(arrAddress && arrAddress.length > 0){
                objCustInfo.addressbook = arrAddress;
              }
              log.debug('Final objCustInfo', objCustInfo);
            }
          }
        }
      }
      return objCustInfo;
    }catch(ex){
      log.error("Error getting Salesforce Customer Information", ex.message);
      customerErrMsg += "Error getting Salesforce Customer Information: " + ex.message + "\n";
      return "";
    }
  }

  function UpdateCustomer(oldCustomer, objCust){
    try{
      var response = "";
      //Create Customer
      var objCustomer = record.load({
        type: "customer",
        id: oldCustomer,
        isDynamic: true
      });

      //Set Body Fields
      for(var prop in objCust) {

        fldType = "", fldValue = "";
        fldValue = objCust[prop];
        if(fldValue){
          	fldValue = String(fldValue).replace(/#doublequote/g,'"');
          	fldValue = String(fldValue).replace(/#slash/g,'"');
        	//log.debug('fldValue 1 : ',fldValue);
        }
        log.debug("Prop - Prop Value - fldValue", prop + " - " + objCust[prop] + " - " + fldValue);  

        //Set Main field value
        if(prop != "addressbook"){ 	
          try{	
            if(fldValue){
              //Don't set any field value, if parameter contains capital letter
              if(library.InitialIsCapital(prop)){
                log.debug("Its a SF field, so no need to set field");
                continue;
              }									

              //get Field Type
              fldType = objCustomer.getField({
                fieldId: prop
              }).type;

              log.debug("Field type", fldType);
              if(fldType == "date"){
                //Set Body field
                if(fldValue){	
                  var newDate = parseAndFormatDateString(fldValue);
                  log.debug("newDate", newDate);
                  objCustomer.setValue(prop, newDate);
                  if(prop == "startdate"){
                    startDate = newDate;
                  }
                  if(prop == "enddate"){
                    endDate = newDate;
                  }
                }
              }
              else if(fldType == "percent"){
                //Set Body field
                if(fldValue){	
                  objCustomer.setValue(prop, fldValue);
                }
              }
              else if(fldType == "select"){
                //Set Body field
                if(isNaN(fldValue)){
                  objCustomer.setText(prop, fldValue);
                }else{
                  objCustomer.setValue(prop, fldValue);
                }
              }	
              else{
                //Set Body field
                if(fldValue){	
                  objCustomer.setValue(prop, fldValue);
                }
              }
            }													
          }catch(ex){
            log.error("Error setting field value - " + prop, ex.message);
          }						
        }
      }//For Loop Ends
      var addCount = objCustomer.getLineCount("addressbook");
      //Remove Address Lines
      var subCount = objCustomer.getLineCount("submachine");
      log.debug("subCount====", JSON.stringify(subCount));
      if(addCount > 0){
        for(var line = addCount - 1; line >= 0; --line){
          objCustomer.removeLine({
            sublistId: 'addressbook',
            line: line,
            ignoreRecalc: true
          });
        }
      }
      //Add customer billing address
		var billingAdd = objCust.custentity_ycs_sfdc_bill_add;
      	if(billingAdd){
          	billingAdd = String(billingAdd).replace(/#doublequote/g,'"');
          	billingAdd = String(billingAdd).replace(/#slash/g,'"');
        	//log.debug('fldValue 1 : ',fldValue);
        }
		log.debug('billingAdd : ',billingAdd);
		if(billingAdd){

			billingAdd = billingAdd.split(';');
          	log.debug('billingAdd : ',billingAdd);
          	var billingAddStr = billingAdd[1];
			log.debug('billingAddStr : ',billingAddStr);
          	var billingAdd1 = String(billingAddStr).split('#enter');
          	var bAdd1 	= String(billingAdd1[0]).trim();
          	var bAdd2 	= String(billingAdd1[1]).trim();
          	log.debug('bAdd1 && bAdd2 : ',bAdd1+' && '+bAdd2);

			// Create the subrecord.
			objCustomer.selectNewLine({
              sublistId : "addressbook"
            });
            var billingSubRec = objCustomer.getCurrentSublistSubrecord({
              sublistId : "addressbook",
              fieldId : "addressbookaddress"
            });

			// Set values on the subrecord.
			// Set country field first when script uses dynamic mode
			billingSubRec.setValue({
				fieldId: 'country',
				value: billingAdd[4]=="United States" ? "US" : billingAdd[4]
			});

			billingSubRec.setValue({
				fieldId: 'city',
				value: billingAdd[2]
			});

			billingSubRec.setValue({
				fieldId: 'state',
				value: billingAdd[3]
			});

			billingSubRec.setValue({
				fieldId: 'zip',
				value: billingAdd[5]
			});

			billingSubRec.setValue({
				fieldId: 'addr1',
				value: bAdd1 //billingAdd[1]
			});

          	billingSubRec.setValue({
				fieldId: 'addr2',
				value: bAdd2
			});

          	billingSubRec.setValue({
				fieldId: 'attention',
				value: billingAdd[7]
			});

			billingSubRec.setValue({
				fieldId: 'addressee',
				value: billingAdd[0]
			});
			if(billingAdd[6])
				billingSubRec.setValue({
					fieldId: 'addrphone',
					value: billingAdd[6]
				});

          	objCustomer.setCurrentSublistValue({sublistId : "addressbook",fieldId:"defaultbilling",value:true});
        	objCustomer.setCurrentSublistValue({sublistId : "addressbook",fieldId:"defaultshipping",value:false});

			objCustomer.commitLine({
              sublistId : "addressbook"
            });
            log.debug("Billing Address", "Added");
		}
	    //End Billing address

		//Add customer shipping address
		var shippingAdd = objCust.custentity_ycs_sfdc_ship_add;
      	if(shippingAdd){
          	shippingAdd = String(shippingAdd).replace(/#doublequote/g,'"');
          	shippingAdd = String(shippingAdd).replace(/#slash/g,'"');
        	//log.debug('fldValue 1 : ',fldValue);
        }
		log.debug('shippingAdd : ',shippingAdd);
		if(shippingAdd){

			shippingAdd = shippingAdd.split(';');
          	log.debug('shippingAdd : ',shippingAdd);
          	var shippingAddStr = shippingAdd[1];
			log.debug('shippingAddStr : ',shippingAddStr);
          	var shippingAdd1 = String(shippingAddStr).split('#enter');
          	//var sAdd1 	= String(shippingAdd1[0]).trim();
          	//var sAdd2 	= String(shippingAdd1[1]).trim();
          	//log.debug('sAdd1 && sAdd2 : ',sAdd1+' && '+sAdd2);
            var sAdd1 = '';
            for(var s=0; s < shippingAdd1.length; s++){
                if(s==0){
                    sAdd1 = shippingAdd1[s];
                }else{
                    sAdd1 = sAdd1 +' , '+shippingAdd1[s];
                }
            }
          	log.debug('sAdd1 : ',sAdd1);
            var shippingAddStr2 = shippingAdd[2];
			log.debug('shippingAddStr2 : ',shippingAddStr2);
          	var shippingAdd2 = String(shippingAddStr2).split('#enter');
            var sAdd2 = '';
            for(var s=0; s < shippingAdd2.length; s++){
                if(s==0){
                    sAdd2 = shippingAdd2[s];
                }else{
                    sAdd2 = sAdd2 +' , '+shippingAdd2[s];
                }
            }
            log.debug('sAdd2 : ',sAdd2);

			// Create the subrecord.
			objCustomer.selectNewLine({
              sublistId : "addressbook"
            });
            var shippingSubRec = objCustomer.getCurrentSublistSubrecord({
              sublistId : "addressbook",
              fieldId : "addressbookaddress"
            });

			// Set values on the subrecord.
			// Set country field first when script uses dynamic mode
			shippingSubRec.setValue({
				fieldId: 'country',
				value: shippingAdd[5]=="United States" ? "US" : shippingAdd[5]
			});

			shippingSubRec.setValue({
				fieldId: 'city',
				value: shippingAdd[3]
			});

			shippingSubRec.setValue({
				fieldId: 'state',
				value: shippingAdd[4]
			});

			shippingSubRec.setValue({
				fieldId: 'zip',
				value: shippingAdd[6]
			});

			shippingSubRec.setValue({
				fieldId: 'addr1',
				value: sAdd1
			});

          	shippingSubRec.setValue({
				fieldId: 'addr2',
				value: sAdd2
			});

          	shippingSubRec.setValue({
				fieldId: 'attention',
				value: shippingAdd[8]
			});

			shippingSubRec.setValue({
				fieldId: 'addressee',
				value: shippingAdd[0]
			});
			if(shippingAdd[6])
				shippingSubRec.setValue({
					fieldId: 'addrphone',
					value: shippingAdd[7]
				});
          	objCustomer.setCurrentSublistValue({sublistId : "addressbook",fieldId:"defaultbilling",value:false});
        	objCustomer.setCurrentSublistValue({sublistId : "addressbook",fieldId:"defaultshipping",value:true});

			objCustomer.commitLine({
              sublistId : "addressbook"
            });
            log.debug("Shipping Address", "Added");
		}
		//End Shipping address

      var addressList = objCust.addressbook;
      var addressShipping = objCust.addressbookshipping;
      if(addressList && addressList.length > 0){
        if(addressShipping){
          if(addressShipping.length > 0){
            addressList = addressList.concat(addressShipping);
          }
        }
      }else{
        if(addressShipping){
          if(addressShipping.length > 0){
            addressList = addressShipping;
          }
        }
      }
      log.debug("addressList", JSON.stringify(addressList));
      if(addressList){
        var defaultBilling = "";
        if(addressList.length > 0){
          for(var count = 0; count < addressList.length; ++count){

            var addressbook = addressList[count];
            objCustomer.selectNewLine({
              sublistId : "addressbook"
            });
            var addSubRecord = objCustomer.getCurrentSublistSubrecord({
              sublistId : "addressbook",
              fieldId : "addressbookaddress"
            });

            for(var prop in addressbook) {

              fldType = "", fldValue = "";
              fldValue = addressbook[prop];
              log.debug("Prop - Prop Value - fldValue", prop + " - " + addressbook[prop] + " - " + fldValue);  
              try{
                if(fldValue){
                  //Don't set any field value, if parameter contains capital letter
                  if(library.InitialIsCapital(prop)){
                    log.debug("Its a SF field, so no need to set field");
                    continue;
                  }

                  if(prop == "defaultbilling"){
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
                  if(fldType == "date"){
                    //Set Body field
                    if(fldValue){	
                      var newDate = parseAndFormatDateString(fldValue);
                      log.debug("newDate", newDate);
                      addSubRecord.setValue(prop, newDate);
                      if(prop == "startdate"){
                        startDate = newDate;
                      }
                      if(prop == "enddate"){
                        endDate = newDate;
                      }
                    }
                  }
                  else if(fldType == "percent"){
                    //Set Body field
                    if(fldValue){	
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }
                  else if(fldType == "select"){
                    //Set Body field
                    if(isNaN(fldValue)){
                      addSubRecord.setText(prop, fldValue);
                    }else{
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }	
                  else{
                    //Set Body field
                    if(fldValue){	
                      addSubRecord.setValue(prop, fldValue);
                    }
                  }
                }													
              }catch(ex){
                log.error("Error setting field value - " + prop, ex.message);
              }						
            }//For Loop Ends
            if(!defaultBilling){
              addSubRecord.setValue("defaultshipping", "T");
              addSubRecord.setValue("defaultbilling", "F");
            }
            objCustomer.commitLine({
              sublistId : "addressbook"
            });
            log.debug("Address", "Added");
          }
        }
      }							
      log.debug("objCustomer", JSON.stringify(objCustomer));	
      if(objCustomer.getValue('custentity_global_account_director__c'))
      {
        log.debug("objCustomer", 'SET SELES REP');
        objCustomer.setValue('salesrep', searchresource(objCustomer.getValue('custentity_global_account_director__c'))); 
      }
      var recordId = objCustomer.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
      });
      log.debug("Old customer updated", recordId);
      if(recordId){
        response = "Existing customer updated successfully in NetSuite: " + recordId;
      }
      return response;
    }catch(ex5){
      log.error("Error in Updating old customer", ex5.message);
      customerErrMsg += "Error in Updating existing customer: " + ex5.message + "\n";
      return "Error in Updating old customer"+ ex5.message;
    }
  }
  function GetTruncatedCustomerExternalId(sfCustId){
    return sfCustId;
    /*try{
				if(sfCustId.length == 18){
					sfCustId = sfCustId.slice(0, -3);
				}
				return sfCustId;
			}catch(ex){
				log.error("Error getting truncated Customer External ID", ex.message);
				errMsg += "Error getting truncated Customer External ID: " + ex.message + "\n";
				return "";
			}*/
  }
  function CheckIfCustomerExists(sfCustId){
    var existCustomer = "";
    try{
      var trunCustId = GetTruncatedCustomerExternalId(sfCustId);
      var custSearch = search.create({
        type: "customer",
        columns: [
          "custentity_external_id",
          "internalid"
        ],
        filters: [
          search.createFilter({
            name: 'custentity_external_id',
            operator: search.Operator.IS,
            values: trunCustId
          })    
        ]
      });
      if(custSearch){
        var custResults = custSearch.run().getRange({start: 0,end: 10});
        if(custResults){
          var custResult = custResults[0];
          if(custResult){
            existCustomer = custResult.getValue("internalid"); 
          }

        }
      }
      return existCustomer;
    }catch(ex2){
      log.error("Error checking existing Customer record", ex2.message);
      customerErrMsg += "Error checking if Customer with SF ID already exists or not: " + ex2.message + "\n";
      return "";
    }	
  }

  return {
    post : UpdateExistingCustomerInNetSuiteFromSF
  }
});




