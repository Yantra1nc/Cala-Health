/**
 * @NApiVersion 2.x
 * @NScriptType restlet
*/
/*************************************************************
 * File Header
 * Script Type: RESTLet
 * Script Name: YTA: RLS_Trigger_CreditMemo_Record 
 * File Name: YTA_RLS_Create_CreditMemo_Record.js
 * Created On: 17/10/2022(17th Oct)
 * Modified On: 17/10/2022(17th Oct)
 * Created By: Ajay Kumar(Yantra Inc)
 * Description:
 * Responsible to redirect to desired RESTLet to create credit memo records
 *********************************************************** */
define(['N/search', 'N/https', 'N/http','N/record', 'N/format', 'N/runtime', 'N/url', './YCS_Library', 'N/task'], 
    function(search, https, http, record, format, runtime, url, library, task) {
		
		var transactionFrom = 12;
	
		function FetchInvoiceFromSF(context){
			try{
				var response = "";
				log.debug("context", context);
				//context = JSON.parse(context);
				if(context){

					//Add setup parameter
					log.debug("final context before sent", JSON.stringify(context));
					
					PreFetchInvoiceFromSF(context);

				}
				log.debug("Parent RESTLet execution Ends here", "Child RESTLet execution must be completed by now.");
				return response;
			}catch(ex){
				log.error("Error in Invoice Restlet : ", ex.message);
			}
		}

		function PreFetchInvoiceFromSF(jsonParam){
			
			try{
				
				//get time when script execution starts
				var startTime = new Date();
				var response = "";

				if(jsonParam){

					//Get Invoice record details from JSON
					var objInv = jsonParam["Invoice"];
					log.debug("objInv", objInv);
					if(objInv){

						//As JSON object comes as array of objects, get 1st object from the array
						var recordDetails = objInv;

						//get Invoice Salesforce ID
						var sfExtId = recordDetails.custbody_eid;
						log.debug("sfExtId", sfExtId);
						var oldInvId = "", sfInvInfo = "";							

						//If record details object presents
						if(recordDetails){
							
							if(sfExtId){
								
								//Get existing Invoice ID if any
								oldInvId = CheckIfInvoiceExists(sfExtId);
								log.debug("Old Invoice If Exists for SF ID: " + sfExtId, oldInvId);

								if(oldInvId){
									//Create new Credit Memo
									var newRecordId = CreateNewCreditMemo(recordDetails);
									response 		= "New Credit Memo created successfully in NetSuite: " + newRecordId;
								}else{
									log.debug("Salesforce invoice external id does not exist in NS account.");
									response 		= "Salesforce invoice external id does not exist in NS account.";
								}
							}						
						}													
					}					
				}
				if(errMsg){					
					//Write in Error Log File
					library.JSONFile(errMsg,startTime,''); 						
				}
				return response;
				
			}catch(ex){
				log.error("Error in Invoice Restlet", ex.message);
				errMsg += "Error in Invoice Sf ID "+sfExtId+" -> Invoice record creation: ";
				errMsg += ex.message;
				errMsg += '\n';
				//Write in Error Log File
				library.JSONFile(errMsg,startTime,'');
				//return ex.message;
			}
		}

		/*****************************************
		* Description: Check If Invoice Already exists
		* Return existing Invoice record ID
		* @param: Salesforce Invoice Ext ID {string}
		* @return: Invoice ID {string}
		******************************************/
		function CheckIfInvoiceExists(sfInvId){	

			var existTran = "";
			try{
				//Run a search on an invoice record to fetch existing record
				var invSearch = search.create({
					type: "invoice",
					columns: [
						"custbody_eid",
						"internalid"
					],
					filters: [
						search.createFilter({
							name: 'custbody_eid',
							operator: search.Operator.IS,
							values: sfInvId
						})    
					]
				});
				if(invSearch){
					var invResults = invSearch.run().getRange({start: 0,end: 10});
					if(invResults){
						var invResult = invResults[0];
						if(invResult){
							existTran = invResult.getValue("internalid"); 
						}
					}
				}
				return existTran;
			}catch(ex2){
				log.error("Error checking existing Invoice record", ex2.message);
				errMsg += "Error checking existing Invoice record: " + ex2.message +"\n";
				return "";
			}	
		}

		/*****************************************
		* Description: Create new credit memo using invoice information object
		* @param: Invoice information {Object}
		* @return: Credit Memo NS ID {string}
		******************************************/
		function CreateNewCreditMemo(objInvoice){
			try{
				log.debug("objInvoice", objInvoice);
				var cmRecordId = "";

				//Create Credit Memo record

				var objCMRecord = record.transform({
					fromType: record.Type.INVOICE,
					fromId: parseInt(objInvoice.internalid),
					toType: record.Type.CREDIT_MEMO,
					isDynamic: true
				});
				objCMRecord.setValue("customform", transactionFrom);

				//Initialize variables
				var fldType = "", fldValue = "", fldId = "", startDate = "", endDate = "";
				for(var prop in objInvoice) {

					fldType = "", fldValue = "";
					fldValue = objInvoice[prop];

					//Set Main field value
					if(prop != "entity" && prop != "customer" && prop != "internalid"){ 	
						try{

							//Don't set any field value, if parameter contains capital letter
							if(library.InitialIsCapital(prop)){
							  //log.debug("Its a SF field, so no need to set field");
							  continue;
							}									

							//get Field Type
							fldType = objCMRecord.getField({
							  fieldId: prop
							}).type;
							log.debug("Prop - Prop Type - fldValue", prop + " - " + fldType + " - " + fldValue); 
							if(fldType == "date")
							{
								//Set Body field
								if(fldValue)
								{
									objCMRecord.setValue(prop, GetDateValidate(fldValue));
								}
							}
							else if(fldType == "percent"){
								//Set Body field
								if(fldValue){	
									objCMRecord.setValue(prop, fldValue);
								}
							}
							else if(fldType == "select"){

								if(prop=="subsidiary")
								{
									if(fldValue)
									{
										objCMRecord.setValue(prop, GetSubsidiaryID(fldValue));
									}
								}
								else
								{
									//Set Body field
									if(isNaN(fldValue)){
										objCMRecord.setText(prop, fldValue);
									}else{
										objCMRecord.setValue(prop, fldValue);
									}
								}
							}
							else{
								//Set Body field
								if(fldValue){	

									if(prop=='custbody_frg_freemium')
									{
										if(fldValue=="true")
										{
											objCMRecord.setValue("custbody_frg_freemium", true);
										}
										else
										{
											objCMRecord.setValue("custbody_frg_freemium", false);
										}
									}
									else
									{
										objCMRecord.setValue(prop, fldValue);
									}
								}
							}
							
						}catch(ex){
							log.error("Error setting field value", prop);
						}						
					}
				}//For Loop Ends

				cmRecordId = objCMRecord.save({
					enableSourcing: true,
					ignoreMandatoryFields: true
				});
				log.debug("New Credit Memo record created", cmRecordId);
				return cmRecordId;
				
			}catch(ex3){
			  log.error("Error in creating Sales Order", ex3.message);
			  errMsg += "Error in creating Sales Order: " + ex3.message + "\n";
			  return "";
			}
		}
		
		function GetSubsidiaryID(name)
		{
			var SubID="1";
			try
			{
				var subsidiarySearchObj = search.create({
					type: "subsidiary",
					filters:
					[
						["name","contains",name], 
						"AND", 
						["isinactive","is","F"]
					],
					columns:
					[
						search.createColumn({
							name: "internalid",
							sort: search.Sort.ASC
						})
					]
				});
				var searchResultCount = subsidiarySearchObj.runPaged().count;
				log.debug("subsidiarySearchObj result count",searchResultCount);
				subsidiarySearchObj.run().each(function(result){
					SubID=result.id;
					return false;
				});
			}
			catch(er){

			}
			return SubID;
		}
		
		function GetDateValidate(fldValue)
		{
			//Set Body field
			if(fldValue)
			{
				log.debug("fldValue - Date", fldValue);  

				var StrDateTime=fldValue.split(" ");
				if(StrDateTime.length>0)
				{
					var StrDate=StrDateTime[0];
					if(StrDate)
					{
						var ObjDate=StrDate.split("-");
						var newDate = new Date();
						newDate.setMonth(parseInt(ObjDate[1]-1));
						newDate.setDate(ObjDate[2]);
						newDate.setYear(ObjDate[0]);
						log.debug("fldValue - Date -newDate", newDate);  
						return newDate;
					}
				}
			}
			return "";
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

		return {
			post : FetchInvoiceFromSF
		}
	
	});