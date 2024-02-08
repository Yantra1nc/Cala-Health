/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
*/
/*************************************************************
 * File Header
 * Script Type: ScheduledScript
 * Script Name: YCS_SS_Map_Oppo_SO_Record
 * File Name: YCS_SS_Map_Oppo_SO_Record.js
 * Created On: 11/05/2018
 * Modified On: 11/05/2018
 * Created By: Ashabari Jena(Yantra Inc)
 * Description:
 * Responsible to create Customer, Contact & Sales Order record creation 
 * by using the JSON sent to this ScheduledScript
 *********************************************************** */
 
define(['N/search', 'N/https', 'N/record', 'N/format', 'N/runtime', './YCS_Library'], 
	function(search, https, record, format, runtime, library) {
		
		var errMsg = '';
		var DEFAULT_SUBSIDIARY = "11";
		var CUSTOMER_RECORD_ID = "-2";
		var CONTACT_RECORD_ID = "-6";
		var gAccessToken = "";
		var gInstanceURL = "";
		var RECORD_TYPE_SALES_ORDER = "salesorder";
		
		/*****************************************
		* Description: get Context Object, Check if SO record already there,
		* If Not Check If Customer exists, if not Create Customer, Contact
		* Then create new sales Order record
		* @param: context Object
		* @return: NA
		******************************************/
        function PreFetchOpportunityFromSF(context) {
            log.debug("Type", context.type);
				//if (context.type !== context.InvocationType.ON_DEMAND)
					//return;
				var strParam = runtime.getCurrentScript().getParameter("custscript_sf_json");
				log.debug("strParam", strParam);
				var jsonParam;
				if(strParam){
					jsonParam = JSON.parse(strParam);
				}
                log.debug("get number of salesorder objects", jsonParam["Sales Order"].length);
                for(var i=0; i < jsonParam["Sales Order"].length; i++) {
                    log.debug("details of salesorder objects 1", jsonParam["Operation"]);   
                    log.debug("details of salesorder objects 2", jsonParam["Sales Order"][i]);   
                    var newContext = JSON.parse('{}');            
                    newContext["Operation"] = jsonParam["Operation"];        
                    newContext["Sales Order"] = jsonParam["Sales Order"][0];        
					newContext["setup"] = jsonParam["setup"];
					log.debug("final newContext after check", JSON.stringify(newContext));
                    FetchOpportunityFromSF(newContext);
                }
        }
		function FetchOpportunityFromSF(jsonParam){
			try{
				//get time when script execution starts
				var startTime = new Date();
				
				var response = "";
				
				if(jsonParam){
					
					//Get Opportunity record details from JSON
					//var objOppty = jsonParam.Opportunity;
					var objOppty = jsonParam["Sales Order"];
					var objSetup = jsonParam.setup;
					log.debug("objSetup", objSetup);
					log.debug("objOppty", objOppty);
					if(objOppty){
						log.debug("inside if", objOppty);
						//As JSON object comes as array of objects, get 1st object from the array
						var recordDetails = objOppty;
						
						//get Opportunity Salesforce ID
						var sfExtId = recordDetails.custbody_eid;
						log.debug("sfExtId", sfExtId);
						var oldOppId = "", sfOppoInfo = "";							
	
						//If record details object presents
						if(recordDetails){												
							if(sfExtId){
								//Get existing Sales Order ID if any
								oldOppId = CheckIfTransactionExists(sfExtId);
								log.debug("Old Sales Order If Exists for SF ID: " + sfExtId, oldOppId);
								
								if(!oldOppId){
									//Create new Sales Order
									response = CreateNewSalesOrder(recordDetails, objSetup);
								}else{
									//Update existing Sales Order
									response = UpdateExistingSalesOrder(oldOppId, recordDetails);
								}
							}						
						}													
					}					
				}
				if(errMsg){					
					//library.ErrorEmailLog(156,errMsg);//As of now we are hard coding config id to 156
					//Write in Error Log File
					library.JSONFile(errMsg,startTime,''); 						
				}
				log.debug("ScheduledScript to create Sales Order and related records Ends here.", "Response should be redirected to Parent RESTLet/Triggered Point.");
				//return response;
			}catch(ex){
				log.error("Error in Opportunity Restlet", ex.message);
				errMsg += "Error in Opportunity Sf ID "+sfExtId+" -> Sales Order record creation: ";
				errMsg += ex.message;
				errMsg += '\n';
				//Write in Error Log File
				library.JSONFile(errMsg,startTime,'');
				//return ex.message;
			}
		}
		
		/*****************************************
		* Description: Get SF Access Token to call SF API
		* @param: NA
		* @return: null
		******************************************/
		function GetAccessToken(){
			try{
				var objTokenDetails = library.GetToken();
				if(objTokenDetails){
					if(objTokenDetails.token){
						gAccessToken = objTokenDetails.token;
					}
					if(objTokenDetails.url){
						gInstanceURL = objTokenDetails.url;
					}
				}
				//log.debug("gAccessToken - gInstanceURL", gAccessToken + " - " + gInstanceURL);				
			}catch(exAccess){
				log.error("Error getting accessToken", exAccess.message);
				errMsg += "Error getting Salesforce Access Token: " + exAccess.message + "\n";
				return ex.message;
			}
		}
		
		/*****************************************
		* Description: Check If Sales Order Already exists
		* Return existing Sales Order record ID
		* @param: Salesforce Opportunity ID {string}
		* @return: Sales Order ID {string}
		******************************************/
		function CheckIfTransactionExists(sfOppId){	
			
			var existTran = "";
			try{
				//Run a search on sales order record to fetch existing record
				var oppSearch = search.create({
				   type: "salesorder",
				   columns: [
					  "custbody_eid",
					  "internalid"
				   ],
				   filters: [
						search.createFilter({
							name: 'custbody_eid',
							operator: search.Operator.IS,
							values: sfOppId
						})    
				   ]
				});
				if(oppSearch){
					var oppResults = oppSearch.run().getRange({start: 0,end: 10});
					if(oppResults){
						var oppResult = oppResults[0];
						if(oppResult){
							existTran = oppResult.getValue("internalid"); 
						}
						
					}
				}
				return existTran;
			}catch(ex2){
				log.error("Error checking existing Customer record", ex2.message);
				errMsg += "Error checking existing Customer record: " + ex2.message +"\n";
				return "";
			}	
		}
		
		/*****************************************
		* Description: Check If Sales Order Already exists
		* Return existing Sales Order record ID
		* @param: Salesforce Opportunity ID {string}
		* @return: Sales Order ID {string}
		******************************************/
		function CreateNewSalesOrder(objSalesOrder, objSetup){
			try{
				var response = "", newRecordId = "";						
				
				//Use Field IDs and values to 
				if(objSalesOrder){
									
					var custId = "";
					
					var arrContactId = new Array();
					var existingContactRecordIds = new Array();
					
					//Get SF Customer & Contact ID and fetch resp NS Customer & contact record ID
					var extCustId = objSalesOrder.customer_external_id;
					log.debug("SF Account ID", extCustId);
					
					if(extCustId){
						
						//Get NetSuite Customer ID by using SF Customer externalid
						custId = GetCustIdUsingExtId(extCustId);
						
						//Check if Customer exists
						if(custId){
							
							log.debug("Customer already exists. So, no need of creating a new customer", custId);											
							if(objSalesOrder.OpportunityContactRole){

								if(objSalesOrder.OpportunityContactRole.length > 0){

									for(var counter = 0; counter < objSalesOrder.OpportunityContactRole.length; ++counter){
														
										var objInformation = objSalesOrder.OpportunityContactRole[counter];
										var extContactId1 = objInformation.custentity_external_id;	
														
										//Check if COntact record exists in NS
										var nsContactId1 = CheckIfContactExists(extContactId1);
										log.debug("nsContactId1", nsContactId1);
										if(nsContactId1) {
											existingContactRecordIds.push(nsContactId1);
										}
									}
								}
								
								//fetch Contact details from JSON 
								var sfContactInfo = GetSalesforceContactDetails(custId, objSalesOrder.OpportunityContactRole);
									
								if(sfContactInfo){
									if(sfContactInfo.length > 0){
										//Create new Contact record
										arrContactId = CreateNewContact(custId, sfContactInfo, objSetup);
									}										
								}									
							}
						}
						//First Create customer and contact and then create Sales Order
						else{
							//get Customer Body field infrom from Opportunity JSON
							var customerInfo = objSalesOrder.Customer;
							log.debug("customerInfo", customerInfo);
							
							//Get Address field info using SF API & combine customer body fields to create customer info object
							var sfCustInfo = GetSalesForceAccountDetails(extCustId, customerInfo);
							custId = CreateCustomer(sfCustInfo, objSetup);   //CreateNewCustomer(sfCustInfo);
							if(custId){	
								if(objSalesOrder.OpportunityContactRole){
									if(objSalesOrder.OpportunityContactRole.length > 0){

									for(var counter = 0; counter < objSalesOrder.OpportunityContactRole.length; ++counter){
														
										var objInformation = objSalesOrder.OpportunityContactRole[counter];
										var extContactId1 = objInformation.custentity_external_id;	
														
										//Check if COntact record exists in NS
										var nsContactId1 = CheckIfContactExists(extContactId1);
										log.debug("nsContactId1", nsContactId1);
										if(nsContactId1) {
											existingContactRecordIds.push(nsContactId1);
										}
									}
								}

									//fetch Contact details from JSON 
									var sfContactInfo = GetSalesforceContactDetails(custId, objSalesOrder.OpportunityContactRole);
										
									if(sfContactInfo){
										if(sfContactInfo.length > 0){
											//Create new Contact record
											arrContactId = CreateNewContact(custId, sfContactInfo, objSetup);
									
										}							
									}
								}									
							}
						}												
						
						if(custId){
							//Add new parameter and value to opportunity object
							objSalesOrder.entity = custId;
							
							//Remove unwanted elements
							delete objSalesOrder.customer_external_id;
							delete objSalesOrder.contact_external_id;
							delete objSalesOrder.customer;
							delete objSalesOrder.OpportunityContactRole;
						
							//Create New Sales Order record
							newRecordId = CreateSalesOrderRecord(objSalesOrder, objSetup.tranform);
							for(var y=0; y< existingContactRecordIds.length; ++y){
								arrContactId.push(existingContactRecordIds[y]);
							}
                          //Attach contact on Salesorder
                          log.debug("arrContactId.length",arrContactId.length);
							for(var z=0; z < arrContactId.length ; ++z) {
								var soconid = record.attach({
									record: {
											 type: 'contact', 
											 id: arrContactId[z]},
									to: {
										 type: 'salesorder', 
										 id: newRecordId}	
								}); 
								log.debug("soconid",soconid);
							}
						}						
					}else{
						response = "Customer SF ID for this SF Opportunity record is missing. First Link Customer record before creating Sales Order record!";
					}					
				}				
				if(newRecordId){
					response = "New Sales Order created successfully in NetSuite: " + newRecordId;
				}else{
					response = "New Sales Order can't be created due to above mentioned error.";
				}
				return response;
			}catch(ex1){
				log.error("Error in fetching SF JSON and creating Sales Order", ex1.message);
				errMsg += "Error in fetching SF JSON and creating Sales Order: " + ex1.message +"\n";
				return "";
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
				log.debug("Customer Info has to be fetched", "As new customer has to be created");
				var objCustInfo = null;
				var accessToken = "";
				var instanceUrl = "";
				
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
						//instanceUrl = instanceUrl+"/services/data/v41.0/sobjects/Account/" + extCustId
						
						//API to fetch only Address fields of Account
						instanceUrl = instanceUrl+"/services/data/v41.0/sobjects/Account/" + extCustId+"?fields=BillingAddress,ShippingAddress";
						log.debug("1. Before sending request to SF", instanceUrl);
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
						//log.debug('response', JSON.stringify(response));
						if(response.body){
							var body = response.body;
							//log.debug('response.body', body);
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
									arrAddress.push(objAddress);
								}
								objCustInfo.addressbook = arrAddress;
								log.debug('Final objCustInfo', objCustInfo);
							}
						}
					}
				}
				return objCustInfo;
			}catch(ex){
				log.error("Error getting Salesforce Customer Information", ex.message);
				errMsg += "Error getting Salesforce Customer Information: " + ex.message + "\n";
				return "";
			}
		}
		
		/*****************************************
		* Description: Create new customer by using Customer information Object
		* @param: Customer info {Object}
		* @return: Customer ID {string}
		******************************************/
		function CreateCustomer(objCust, objSetup){
			try{
				var response = "";
				//Create Customer
				var objCustomer = record.create({
					type: "customer",
					isDynamic: true
				});
				if(objSetup.subsidiary){
					objCustomer.setValue("subsidiary", objSetup.subsidiary);
				}
				if(objSetup.entityform){
					objCustomer.setValue("customform", objSetup.entityform);
				}				
				objCustomer.setValue("isperson", "F");				
				objCustomer.setValue("pricelevel", "1");
				
				var fldType = "", fldValue = "", fldId = "";
				for(var prop in objCust) {
									
					fldType = "", fldValue = "";
					fldValue = objCust[prop];
					//log.debug("Prop - Prop Value - fldValue", prop + " - " + objCust[prop] + " - " + fldValue);  
					
					//Set Main field value
					if(prop != "addressbook"){ 	
						try{	
							if(fldValue){
								//Don't set any field value, if parameter contains capital letter
								if(library.InitialIsCapital(prop)){
									//log.debug("Its a SF field, so no need to set field");
									continue;
								}									
																
								//Get Field Data Type
								fldType = objCustomer.getField({
									fieldId: prop
								}).type;
								if(fldType == "date"){
									//Set Body field
									if(fldValue){	
										var newDate = new Date(fldValue); //parseAndFormatDateString(fldValue);
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
								
				var addressList = objCust.addressbook;
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
								//log.debug("Prop - Prop Value - fldValue", prop + " - " + addressbook[prop] + " - " + fldValue);  
								try{
									if(fldValue){
										//Don't set any field value, if parameter contains capital letter
										if(library.InitialIsCapital(prop)){
											//log.debug("Its a SF field, so no need to set field");
											continue;
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
							
							objCustomer.commitLine({
								sublistId : "addressbook"
							});
							log.debug("Address", "Added");
						}
					}
				}							
				log.debug("objCustomer", JSON.stringify(objCustomer));
				var recordId = objCustomer.save({
					enableSourcing: true,
					ignoreMandatoryFields: true
				});
				log.debug("New Customer Record", recordId);				
				if(recordId){
					response = "New customer created successfully in NetSuite: " + recordId;
				}
				return recordId;
			}catch(ex4){
				log.error("Error in Creating New Customer", ex4.message);
				errMsg += "Error in Creating New Customer: " + ex4.message + "\n";
				return "Error in Creating New Customer" + ex4.message;
			}
		}
		
		function GetTruncatedCustomerExternalId(sfCustId){
			try{
				if(sfCustId.length == 18){
					//sfCustId = sfCustId.slice(0, -3);
				}
				return sfCustId;
			}catch(ex){
				log.error("Error getting truncated Customer External ID", ex.message);
				errMsg += "Error getting truncated Customer External ID: " + ex.message + "\n";
				return "";
			}
		}
		
		/*****************************************
		* Description: Check If Customer Already exists
		* Return existing Customer record ID
		* @param: Customer SF ID {string}
		* @return: Customer NS ID {string}
		******************************************/
		function GetCustIdUsingExtId(sfCustId){
			var existCustomer = "";
			try{
				sfCustId = GetTruncatedCustomerExternalId(sfCustId);
				log.debug("Truncated sfCustId", sfCustId);
				
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
							values: sfCustId
						})    
				   ]
				});
				if(custSearch){
					var custResults = custSearch.run().getRange({start: 0,end: 10});
					if(custResults){
						var custResult = custResults[0];
						if(custResult){
							existCustomer = custResult.getValue("internalid"); 
							log.debug("existCustomer", existCustomer);
						}
						
					}
				}
				return existCustomer;
			}catch(ex2){
				log.error("Error checking existing Customer record", ex2.message);
				errMsg += "Error checking existing Customer record: " + ex2.message + "\n";
				return "";
			}	
		}
		
		/*****************************************
		* Description: Get SF Account Details needs to be used to create Customer record in NS
		* Main Job of this function is to retrive Biiling & Shipping Address details of Customer from SF API call
		* @param: Salesforce Account ID {string}
		* @param: Customer info {Object}
		* @return: Customer info {Object}
		******************************************/
		function GetSalesforceContactDetails(custId, contactInfo){
			try{
				log.debug("Contact Info has to be fetched", "As new Contact has to be created: " + contactInfo);
				var objContact = null;
				var arrContactInfo = new Array();
				var accessToken = "", instanceUrl = "", extContactId = "", nsContactId = "";
				
				if(contactInfo.length > 0){
					for(var count = 0; count < contactInfo.length; ++count){
						
						var objContactInfo = contactInfo[count];
						log.debug("objContactInfo", objContactInfo);
						accessToken = "", instanceUrl = "", extContactId = "", nsContactId = "";
						
						//Get SF Contact ID
						extContactId = objContactInfo.custentity_external_id;	
						
						//Check if COntact record exists in NS
						nsContactId = CheckIfContactExists(extContactId);
						log.debug("nsContactId", nsContactId);
						if(!nsContactId){
							
							//var arrContactInfo = contactInfo
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
									//instanceUrl = instanceUrl+"/services/data/v41.0/sobjects/Contact/" + extContactId
									
									//API to fetch only Address fields of Contact
									instanceUrl = instanceUrl+"/services/data/v41.0/sobjects/Contact/" + extContactId +"?fields=MailingAddress";
									log.debug("1. Before sending request to SF", instanceUrl);
									
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
									//log.debug('response', JSON.stringify(response));
									if(response.body){
										var body = response.body;
										//log.debug('response.body', body);
										var respBody = JSON.parse(body);
										log.debug('respBody', respBody);
										var arrAddress = new Array();
										
										if(respBody){
											objContact = new Object();
											//Add all customer body field information got from JSON in Customer Object
											objContact = objContactInfo;
											objContact.company = custId; 
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
											
											if(objAttributes.MailingAddress){
												var billAddress = objAttributes.MailingAddress;
												var objAddress = new Object();
												
												//Fetch only objects where SF Sublist is "MailingAddress"
												var billAddGrp = arrMappingList.filter(function(a) { 
														return(a.sfsublist == "MailingAddress");
													}
												);
												log.debug("MailAddGrp", JSON.stringify(billAddGrp));
												
												//Set Address Object by using mapping field IDs
												for(var count = 0; count < billAddGrp.length; ++count){
													objAddress[billAddGrp[count].nsfield] = billAddress[billAddGrp[count].sffield];
												}
												objAddress.defaultbilling = "F";
												objAddress.defaultshipping = "T";
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
												arrAddress.push(objAddress);
											}
											objContact.addressbook = arrAddress;
											//log.debug('Final objContact', objContact);
										}
									}
								}
							}
						}	
						if(objContact){
							arrContactInfo.push(objContact);
						}						
					}
				}
				log.debug('Final objContact', (arrContactInfo));
				return arrContactInfo;
			}catch(ex){
				log.error("Error getting Salesforce Customer Information", ex.message);
				errMsg += "Error getting Salesforce Customer Information: " + ex.message + "\n";
				return "";
			}
		}
		
		/*****************************************
		* Description: Create new customer by using Customer information Object
		* @param: Customer info {Object}
		* @return: Customer ID {string}
		******************************************/
		function CreateNewContact(customerId, arrContactListInfo, objSetup){
			try{
				
				var response = "";
				var arrRecordIds = new Array();
				if(arrContactListInfo.length > 0){
					var objContactInfo;
					for(var contactCount = 0; contactCount < arrContactListInfo.length; ++contactCount){
						objContactInfo = arrContactListInfo[contactCount];
						log.debug("objContactInfo", JSON.stringify(objContactInfo));
						
						//Create Contact
						var objContact = record.create({
							type: "contact",
							isDynamic: true
						});
						objContact.setValue("subsidiary", objSetup.subsidiary);
						//objContact.setValue("customform", "-2");
						objContact.setValue("customform", objSetup.contactform);
						log.debug("subsidiary - Form", objSetup.subsidiary + " - " + objSetup.contactform);
						
						var fldType = "", fldValue = "", fldId = "";
						for(var prop in objContactInfo) {
											
							fldType = "", fldValue = "";
							fldValue = objContactInfo[prop];
							//log.debug("Prop - Prop Value - fldValue", prop + " - " + objContactInfo[prop] + " - " + fldValue);  
							
							//Set Main field value
							if(prop != "addressbook"){ 	
								try{	
									if(fldValue){
										//Don't set any field value, if parameter contains capital letter
										if(library.InitialIsCapital(prop)){
											log.debug("It's a SF field, so no need to set field");
											continue;
										}									
																		
										//Get Field Data Type
										fldType = objContact.getField({
											fieldId: prop
										}).type;
										log.debug("Prop - Prop Value - fldValue", prop + " - " + fldValue + " - " + fldValue);
										if(fldType == "date"){
											//Set Body field
											if(fldValue){	
												var newDate = new Date(fldValue); //parseAndFormatDateString(fldValue);
												log.debug("newDate", newDate);
												objContact.setValue(prop, newDate);
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
												objContact.setValue(prop, fldValue);
											}
										}
										else if(fldType == "select"){
											//Set Body field
											if(isNaN(fldValue)){
												objContact.setText(prop, fldValue);
											}else{
												objContact.setValue(prop, fldValue);
												}
											}	
										else{
											//Set Body field
											if(fldValue){	
												objContact.setValue(prop, fldValue);
											}
										}
									}													
								}catch(ex){
									log.error("Error setting field value - " + prop, ex.message);
								}						
							}
						}//For Loop Ends
										
						var addressList = objContactInfo.addressbook;
					
						log.debug("addressList", JSON.stringify(addressList));
						if(addressList){
							if(addressList.length > 0){
								for(var count = 0; count < addressList.length; ++count){
									
									var addressbook = addressList[count];
									objContact.selectNewLine({
										sublistId : "addressbook"
									});
									var addSubRecord = objContact.getCurrentSublistSubrecord({
										sublistId : "addressbook",
										fieldId : "addressbookaddress"
									});
													
									for(var prop in addressbook) {
											
										fldType = "", fldValue = "";
										fldValue = addressbook[prop];
										//log.debug("Prop - Prop Value - fldValue", prop + " - " + addressbook[prop] + " - " + fldValue);  
										try{
											if(fldValue){
												//Don't set any field value, if parameter contains capital letter
												if(library.InitialIsCapital(prop)){
													//log.debug("Its a SF field, so no need to set field");
													continue;
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
											log.error("Error setting address sublist field value - " + prop, ex.message);
										}						
									}//For Loop Ends
									
									objContact.commitLine({
										sublistId : "addressbook"
									});
									log.debug("Address", "Added");
								}
							}
						}							
						log.debug("objContact", JSON.stringify(objContact));
						var recordId = objContact.save({
							enableSourcing: true,
							ignoreMandatoryFields: true
						});
						log.debug("New Contact Record created", recordId);				
						if(recordId){
							arrRecordIds.push(recordId);
							response += "New Contact created successfully in NetSuite: " + recordId+". \n";
						}
					}
				}				
				return arrRecordIds;
			}catch(ex4){
				log.error("Error in Creating New Contact", ex4.message);
				errMsg += "Error in Creating New Contact: " + ex4.message + "\n";
				return "Error in Creating New Contact" + ex4.message;
			}
		}
		
		/*****************************************
		* Description: Create new sales Order using sales order information object
		* @param: Sales order information {Object}
		* @return: Sales Order NS ID {string}
		******************************************/
		function CreateSalesOrderRecord(objSalesOrder, transactionFrom){
			try{
				log.debug("objSalesOrder", objSalesOrder);
				//delete objSalesOrder.customer;
				//log.debug("objSalesOrder after deleting customer parameter", JSON.stringify(objSalesOrder));
				var soRecordId = "";
				
				//Create Sales Order record
				var objSalesRecord = record.create({
					type: RECORD_TYPE_SALES_ORDER,
					isDynamic: true
				});
				objSalesRecord.setValue("customform", transactionFrom); //"349");
				//objSalesRecord.setValue("custbody_end_user", "75808");
				
				var fldType = "", fldValue = "", fldId = "", startDate = "", endDate = "";
				for(var prop in objSalesOrder) {
					
					fldType = "", fldValue = "";
					fldValue = objSalesOrder[prop];
					
					//Set Main field value
					if(prop != "customer" && prop != "OpportunityContactRole" && prop != "OpportunityLineItem"){ 	
						try{
							
							//Don't set any field value, if parameter contains capital letter
							if(library.InitialIsCapital(prop)){
								//log.debug("Its a SF field, so no need to set field");
								continue;
							}									
										
							//get Field Type
							fldType = objSalesRecord.getField({
								fieldId: prop
							}).type;
							//log.debug("Prop - Prop Type - fldValue", prop + " - " + fldType + " - " + fldValue);  
							if(fldType == "date"){
								//Set Body field
								if(fldValue){	
									var newDate = new Date(fldValue); //parseAndFormatDateString(fldValue);
									log.debug("newDate", newDate);
									objSalesRecord.setValue(prop, newDate);
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
									objSalesRecord.setValue(prop, fldValue);
								}
							}
							else if(fldType == "select"){
								//Set Body field
								if(isNaN(fldValue)){
									objSalesRecord.setText(prop, fldValue);
								}else{
									objSalesRecord.setValue(prop, fldValue);
								}
							}	
							else{
								//Set Body field
								if(fldValue){	
									objSalesRecord.setValue(prop, fldValue);
								}
							}
						}catch(ex){
							log.error("Error setting field value", prop);
						}						
					}
				}//For Loop Ends
							
				//Enter Line Item
				var arrObjItems = objSalesOrder.OpportunityLineItem;
				log.debug("arrObjItems", arrObjItems);
				if(arrObjItems){
					if(arrObjItems.length > 0){
						var objItems = "";
						//Add each line
						for(var lineCount = 0; lineCount < arrObjItems.length; ++lineCount){
							
							try{
								objItems = "";
								objItems = arrObjItems[lineCount];
								log.debug("Item Object", JSON.stringify(objItems));
								if(objItems){
									
									//Item Object used to create new Item
									var objItem = new Object();
									objItem.sfproductid = objItems.Product2Id;
									objItem.displayname = objItems.displayname;
									objItem.itemid = objItems.ProductCode;
									var productId = GetItemRecordId(objItem);
									objItems.item = productId;
									objItems.amount = objItems.quantity* objItems.rate;
									
									objSalesRecord.selectNewLine({sublistId: 'item'}); //, line:count
									
									for(var prop in objItems) {
										
										//Don't set any field value, if parameter contains capital letter
										if(library.InitialIsCapital(prop)){
											//log.debug("Its a SF field, so no need to set field");
											continue;
										}	
										var newfieldValue = objItems[prop];
										if(prop == 'custcol_atlas_svs_em_rev_start_date' || prop == 'custcol_atlas_svs_em_rev_end_date') {
											if(newfieldValue.indexOf(' ') > 0) {
												var temp = newfieldValue.split(' ');
												newfieldValue = temp[0]; 
											}
											if(newfieldValue != null && newfieldValue != '' && newfieldValue.length > 0) {
												var arrDateInfo = newfieldValue.split("-");
												var year = arrDateInfo[0];
												var month = arrDateInfo[1] - 1;
												var day = arrDateInfo[2];
												newfieldValue = new Date(year, month, day); //month+"/"+day+"/"+year;
												
											}
											log.debug("newfieldValue", newfieldValue);
										}
										objSalesRecord.setCurrentSublistValue({
											sublistId: 'item',
											fieldId: prop,
											value: newfieldValue
										});  
									}								
									objSalesRecord.commitLine({sublistId: 'item'});
								}
							}
							catch(exItem){
								log.error("Error adding Line Item to Sales Order", exItem.message);
								errMsg += "Error adding Line Item to Sales Order: " + exItem.message + "\n";
							}
						}
					}
				}
				soRecordId = objSalesRecord.save({
					enableSourcing: true,
					ignoreMandatoryFields: true
				});
				log.debug("New Sales Order created", soRecordId);
				return soRecordId;
			}catch(ex6){
				log.error("Error in creating Sales Order", ex6.message);
				errMsg += "Error in creating Sales Order: " + ex6.message + "\n";
				return "";
			}
		}
		
		function GetItemRecordId(objSFItemInfo){
			try{
				log.debug("Check Item record if exists", JSON.stringify(objSFItemInfo));
				var productId = "";
				var extId = GetItemUsingExtId(objSFItemInfo.sfproductid);
				log.debug("Item extId", extId);
				if(extId){
					productId = extId;
				}/*else{
					var objItemRecord = record.create({
						type: "inventoryitem",
						isDynamic: true
					});
					objItemRecord.setValue("itemid", objSFItemInfo.itemid);
					objItemRecord.setValue("displayname", objSFItemInfo.displayname);
					objItemRecord.setValue("custitem_salesforce_prd_id", objSFItemInfo.sfproductid);
					
					productId = objItemRecord.save({
						enableSourcing: true,
						ignoreMandatoryFields: true
					});
					log.debug("New Item created", productId);
				}
				//log.debug("productId", productId);*/
				return productId;
			}catch(exItem){
				log.error("Error getting Item record ID from NetSuite", exItem.message);
				errMsg += "Error getting Item record ID from NetSuite: " + exItem.message + "\n";
				return "";
			}
		}
		
		function GetItemUsingExtId(sfItemId){
			try{
				//log.debug("Item Sf ID", sfItemId);
				var existItemId = "";
				var itemSearch = search.create({
				   type: "item",
				   columns: [
					  "custitem_salesforce_prd_id",
					  "internalid"
				   ],
				   filters: [
						search.createFilter({
							name: 'custitem_salesforce_prd_id',
							operator: search.Operator.IS,
							values: sfItemId
						})    
				   ]
				});
				if(itemSearch){
					var itemResults = itemSearch.run().getRange({start: 0,end: 10});
					log.debug("itemResults", JSON.stringify(itemResults));
					if(itemResults){
						var itemResult = itemResults[0];
						if(itemResult){
							existItemId = itemResult.getValue("internalid"); 
						}
						
					}
				}
				//log.debug("existItemId", existItemId);
				return existItemId;
			}catch(ex3){
				log.error("Error getting Item ID using ext ID", ex3.message);
				errMsg += "Error getting Item ID using SF External ID ID: " + ex3.message + "\n";
				return "";
			}
		}
		
		function parseAndFormatDateString(date) {
			try{
				var userObj = runtime.getCurrentUser();
				var dateformat = userObj.getPreference({name: "DATEFORMAT"});
				log.debug("date - dateformat", date +" - "+ dateformat);
				var formattedDate = library.ParseToNSDate(date, dateformat);
				log.debug("formattedDate", formattedDate);
				return formattedDate;
			}catch(ex1){
				log.error("Error in parseAndFormatDateString", ex1.message);
				errMsg += "Error in parseAndFormatDateString: " + ex1.message + "\n";
			}
        }
		
		function UpdateExistingSalesOrder(oldOppId, objSalesOrder){
			try{
				var response = "";
				//Create Customer
				var objSalesRecord = record.load({
					type: RECORD_TYPE_SALES_ORDER, //"opportunity",
					id: oldOppId,
					isDynamic: true
				});
				var arrSOMainFlds = Object.getOwnPropertyNames(objSalesOrder);
				log.debug("arrSOMainFlds", arrSOMainFlds);
				
				var fldType = "", fldValue = "", fldId = "";
				for(var prop in objSalesOrder) {
					
					fldType = "", fldValue = "";
					fldValue = objSalesOrder[prop];
					//log.debug("Prop - Prop Value - fldValue", prop + " - " + objSalesOrder[prop] + " - " + fldValue);  
					//Set Main field value
					if(prop != "lineiteminfo" && prop != "customer_external_id" && prop != "contact_external_id"){ 	
						try{
							//Don't set any field value, if parameter contains capital letter
							if(library.InitialIsCapital(prop)){
								//log.debug("Its a SF field, so no need to set field");
								continue;
							}									
										
							//get Field Type
							fldType = objSalesRecord.getField({
								fieldId: prop
							}).type;
							//log.debug("Field type", fldType);
							if(fldType == "date"){
								//Set Body field
								if(fldValue){	
									var newDate = parseAndFormatDateString(fldValue);
									log.debug("newDate", newDate);
									objSalesRecord.setValue(prop, newDate);
								}
							}
							else if(fldType == "percent"){
								//Set Body field
								if(fldValue){	
									objSalesRecord.setValue(prop, fldValue);
								}
							}
							else if(fldType == "select"){
								//Set Body field
								if(isNaN(fldValue)){
									objSalesRecord.setText(prop, fldValue);
								}else{
									objSalesRecord.setValue(prop, fldValue);
								}
							}	
							else{
								//Set Body field
								if(fldValue){	
									objSalesRecord.setValue(prop, fldValue);
								}
							}
						}catch(ex){
							log.error("Error setting field value", prop);
						}						
					}
				}//For Loop Ends
	
				var recordId = objSalesRecord.save({
					enableSourcing: true,
					ignoreMandatoryFields: true
				});
				log.debug("Old Sales Order Updated", recordId);
				if(recordId){
					response = "Existing Sales Order updated successfully in NetSuite: " + recordId;
				}
				return response;
			}catch(ex){
				log.error("Error in Updating Existing Sales Order record", ex.message);
				errMsg += "Error in Updating Existing Sales Order record" + ex.message;
				return "Error in Updating old Sales Order record " + ex.message;
			}
		}
		
		//Check If Contact Already exists
		//Return existing Contact record ID
		function CheckIfContactExists(sfContId){
			var existContact = "";
			try{
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
						})    
				   ]
				});
				if(custSearch){
					var custResults = custSearch.run().getRange({start: 0,end: 10});
					if(custResults){
						var custResult = custResults[0];
						if(custResult){
							existContact = custResult.getValue("internalid"); 
						}						
					}
				}
				return existContact;
			}catch(ex2){
				log.error("Error checking existing Customer record", ex2.message);
				return "";
			}	
		}
		
		return {
			//post : FetchOpportunityFromSF
			execute: PreFetchOpportunityFromSF
		}
});