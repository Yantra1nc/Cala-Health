/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/**
 * Script Modification Log:
 *Current Version: V4
 * Modified:
    -- Date -- 	Version	-- Modified By -- 	Env		--Requested By-- 					-- Description --
    15th Dec 2022				Ajay				Gautam Mishra				Upda Item Receipt/Item Shipment line item serial and lot number in custom column field.
	01/27/2023		V1			Asha				Gautam Mishra				Update Lot/Serial Number on Line from mRMA lines, if IR is created from RMA
	01/27/2023		V2			Asha				Gautam Mishra				Update Lot/Serial Number on Line from mRMA lines, if IR is created from RMA
	02/05/2023		V3			Asha				Gautam Mishra				Update code for UPS tracking number
	02/13/2023		V4			Asha		Prod	Gautam Mishra				Update code to change logic to get only unique Lot Number
 *
 */
 
 define(['N/search', 'N/record', 'N/config', 'N/runtime', 'N/format', './YCS_Library','N/https', 'N/log'],
    function(search, record, config, runtime, format, library, https, log) {

		function afterSubmit(scriptContext){

			try{

				log.debug('Start IR/IF');
              	var currDate  = new Date();
				var flag = false, invtNumArr = [];
              	var packageTrackingId = '', packageTrackingNo = '';
              	var recObj 	= scriptContext.newRecord;
              	var tranType= recObj.type;//get record type
				log.debug('tranType : ',tranType);
				var recId 	= recObj.id;//record id
              	log.debug('recId : ',recId);

				//Load an item receipt/fulfillment record
				var irRecord = record.load({
					type: tranType,
					id: parseInt(recId),
					isDynamic: true
				});

              	if(tranType=='itemfulfillment'){

                    var newStatus = irRecord.getValue({fieldId:'status'});
                    var oldStatus = recObj.getValue({fieldId:'status'});
                    log.debug('oldStatus && newStatus : ',oldStatus+' && '+newStatus);
                    if(oldStatus!='Shipped' && newStatus=='Shipped'){
                       irRecord.setValue({fieldId:"custbody_ch_act_shipped_date",value:currDate});
                    }
                }//end transaction type

				var createdFrom = irRecord.getValue("createdfrom");
				log.debug("createdFrom", createdFrom);

				var isLotUpdated = false;
				if(createdFrom){
					var isParentRMA = CheckIfParentIsRMA(createdFrom);
					if(isParentRMA){
						if(tranType != 'itemfulfillment'){
							
							isLotUpdated = true;
							log.debug("isLotUpdated", isLotUpdated);
							var arrRMALotLines = GetParentRMALotInfo(createdFrom);
							log.debug("arrRMALotLines", JSON.stringify(arrRMALotLines));
							
							if(arrRMALotLines){
								if(arrRMALotLines.length > 0){
									
									var rmaItem = "", rmaLot = "", rmaSrlNo = "", matchLine = -1, itemId = "";
									
									for(var index = 0; index < arrRMALotLines.length; ++index){
										
										rmaItem = "", rmaLot = "", rmaSrlNo = "", matchLine = -1;
										itemId = arrRMALotLines[index].item;
										log.debug("Array Index. " + index + ": Item", itemId);
										matchLine = irRecord.findSublistLineWithValue({sublistId: 'item',fieldId: 'item',value: itemId});
										log.debug("Line matched for item " + itemId, matchLine);
										
										if(matchLine > -1){
											irRecord.selectLine({sublistId: 'item',line: matchLine});

											irRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_serialnumber', value: arrRMALotLines[index].srlnum});
											irRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_lotnumber', value: arrRMALotLines[index].lotnum});
											//custcol_ch_ns_serial_number , custcol_ch_ns_lot_number
											irRecord.commitLine({sublistId: 'item'});
											flag = true;
										}
									}
								}
							}
						}
					}
				}

				//If Created From RMA, then stop processing
				if(!isLotUpdated){

                  	var shipDate = null;

					//Get Item sublist Line count of an item receipt/fulfillment
					var irLineCount = irRecord.getLineCount({sublistId: 'item'});
					log.debug('irLineCount : ',irLineCount);

					//Loop through get all lines and set serial/lot of an item
					for(var f=0;f<irLineCount;f++){

						//Select item sublist per line number
						irRecord.selectLine({sublistId: 'item',line: f});

						var line 		= parseInt(irRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'line'}));
						//log.debug('line : ',line);
						var itemId 		= irRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'item'});
						//log.debug('itemId : ',itemId);
						var itemExtId 	= irRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_leid'});
						//log.debug('itemExtId : ',itemExtId);

						// Get inventory detail subrecord for that line.
						var subrec = irRecord.getCurrentSublistSubrecord({
							sublistId: 'item',
							fieldId: 'inventorydetail'
						});

						//Get subrec line count
						var subLineCount = subrec.getLineCount({sublistId: 'inventoryassignment'});
						log.debug('subLineCount : ',subLineCount);

						var serials = '', lots = '';
						var serialNoArr = [], lotNoArr = [];

						for(var s=0; s<subLineCount; s++){

							var srNoId = '', srNo = '';

							subrec.selectLine({
								sublistId: 'inventoryassignment',
								line: s
							});

							if(tranType=='itemfulfillment'){

								srNoId = subrec.getCurrentSublistValue({
									sublistId: 'inventoryassignment',
									fieldId: 'issueinventorynumber'
								});
								srNo = subrec.getCurrentSublistText({
									sublistId: 'inventoryassignment',
									fieldId: 'issueinventorynumber'
								});
								if(srNoId > 0){

									//Load Inventory number record
									var invtNoObj = record.load({
										type: 'inventorynumber',
										id: srNoId,
										isDynamic: true
									});

									var lotNo = invtNoObj.getValue({fieldId:'custitemnumber_ch_lotnumber'});
									//log.debug('lotNo : ',lotNo);
									
									if(lotNoArr.indexOf(lotNo) == -1){
										lotNoArr.push(lotNo);
										lotNoArr.push(',');
									}
								}

							}
							//Runs on Item Receipt
							else{

								srNoId = subrec.getCurrentSublistValue({
									sublistId: 'inventoryassignment',
									fieldId: 'receiptinventorynumber'
								});
								srNo = subrec.getCurrentSublistText({
									sublistId: 'inventoryassignment',
									fieldId: 'receiptinventorynumber'
								});

								var invtNumId = GetInventoryNoId(itemId,srNoId);
								//log.debug('invtNumId : ',invtNumId);

								if(invtNumId > 0){

									//Update Inventory number record
									var invtNoObj = record.load({
										type: 'inventorynumber',
										id: invtNumId,
										isDynamic: true
									});

									var lotNo = invtNoObj.getValue({fieldId:'custitemnumber_ch_lotnumber'});
									//log.debug('lotNo : ',lotNo);

									//lotNoArr.push(lotNo);
									//lotNoArr.push(',');
									if(lotNoArr.indexOf(lotNo) == -1){
										lotNoArr.push(lotNo);
										lotNoArr.push(',');
									}
								}
							}
							log.debug('srNoId & srNo : ',srNoId+' && '+srNo);

							serialNoArr.push(srNo);
							serialNoArr.push(',');

							if(s == subLineCount-1){

								serialNoArr.pop('|');
								lotNoArr.pop('|');

								for(var t=0; t < serialNoArr.length; t++){
									serials = serials + serialNoArr[t];
								}
								for(var tt=0; tt < lotNoArr.length; tt++){
									lots = lots + lotNoArr[tt];
								}

								invtNumArr.push({"itemExtId":itemExtId,"serials":serials,"lots":lots});
							}

						}//End serial numbers for loop
						log.debug('serials & lots : ',serials +' && '+lots);

						irRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_ch_serialnumber',
							value: serials,
							ignoreFieldChange: false
						});

						irRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_ch_lotnumber',
							value: lots,
							ignoreFieldChange: false
						});

						//commit sublist line item
						irRecord.commitLine({sublistId: 'item'});
						flag = true;
					}//End for loop of line item
				}

				var tranDate = irRecord.getValue({fieldId:'trandate'});
				//log.debug('tranDate 0 : ',tranDate);

              	var externalId = irRecord.getValue({fieldId:'custbody_eid'});
				log.debug('externalId : ',externalId);

              	if(tranType == "itemfulfillment"){
                  	shipDate = irRecord.getValue({fieldId:'custbody_ch_act_shipped_date'});
					log.debug('shipDate 0 : ',shipDate);
                  	var carrier = irRecord.getValue({fieldId:'carrierform'});
					log.debug('carrier : ',carrier);
					//Get packageTrackingNo of fulfillment
                  	if(carrier == "fedex"){
                      	irRecord.selectLine({sublistId: 'packagefedex',line: 0});
                      	packageTrackingId 	= irRecord.getCurrentSublistValue({sublistId: 'packagefedex',fieldId: 'trackingnumberkeyfedex'});
                      	packageTrackingNo 	= irRecord.getCurrentSublistValue({sublistId: 'packagefedex',fieldId: 'packagetrackingnumberfedex'});
                    }else if(carrier == "usps"){
                      	irRecord.selectLine({sublistId: 'packageusps',line: 0});
                      	packageTrackingId 	= irRecord.getCurrentSublistValue({sublistId: 'packageusps',fieldId: 'trackingnumberkeyusps'});
                      	packageTrackingNo 	= irRecord.getCurrentSublistValue({sublistId: 'packageusps',fieldId: 'packagetrackingnumberusps'});
                    }
					else if(carrier == "ups"){
                      	irRecord.selectLine({sublistId: 'packageups',line: 0});
                      	packageTrackingId 	= irRecord.getCurrentSublistValue({sublistId: 'packageups',fieldId: 'trackingnumberkeyups'});
                      	packageTrackingNo 	= irRecord.getCurrentSublistValue({sublistId: 'packageups',fieldId: 'packagetrackingnumberups'});
                    }
                    log.debug('packageTrackingNo : ',packageTrackingNo);
				}

				if(flag == true){
					//save the item receipt/fulfillment record
					var recId = irRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
					log.debug('Update IR/IF record id is : ',recId);

					if(recId > 0){
                      	var dataObj = {"recId":recId,"tranType":tranType,"tranDate":tranDate,"shipDate":shipDate,"invtNumArr":invtNumArr,"packageTrackingId":packageTrackingId,"packageTrackingNo":packageTrackingNo,"externalId":externalId};
						UpdateInSalesForce(dataObj);
					}
				}
			}catch(e){
				log.debug('Exception in an Item Receipt/fulfillment creation :',e.message);
			}

		}//End Main function
		
		function GetParentRMALotInfo(argCreatedFromId){
			try{
				var arrItemLotList = [];
					var colType = search.createColumn({ name: 'type' });
					var colDocumentNumber = search.createColumn({ name: 'tranid' });
					var colItem = search.createColumn({ name: 'item' });
					var colNsSerialNumber = search.createColumn({ name: 'custcol_ch_ns_serial_number' }); 
					var colNsLotNumber = search.createColumn({ name: 'custcol_ch_ns_lot_number' });
					var objRMASearch = search.create({
					  type: 'transaction',
					  filters: [
						['internalid', 'anyof', argCreatedFromId],
						'AND',
						['mainline', 'is', 'F'],
						 'AND',
						['type', 'anyof', 'RtnAuth'],
					  ],
					  columns: [
						colType,
						colDocumentNumber,
						colItem,
						colNsSerialNumber,
						colNsLotNumber,
					  ],
					});
					
					// Note: Search.run() is limited to 4,000 results
					 objRMASearch.run().each(function(result){
						
						log.debug("RMA Line result", JSON.stringify(result));
						var item = result.getValue(colItem);
						var srlNum = result.getValue(colNsSerialNumber);
						var lotNum = result.getValue(colNsLotNumber);
						if(srlNum || lotNum){
							arrItemLotList.push({"item": item, "srlnum": srlNum, "lotnum": lotNum});
						}
						return true;
					 });
				return arrItemLotList;
			}catch(ex){
				log.error("Error getting RMA details", ex.message);
				return "";
			}
		}


		function CheckIfParentIsRMA(argCreatedFromId){
			try{
				var recordId = "";
					var colType = search.createColumn({ name: 'type' });
					var colId = search.createColumn({ name: 'internalid' });
					var objRMASearch = search.create({
					  type: 'transaction',
					  filters: [
						['internalid', 'anyof', argCreatedFromId],
						'AND',
						['mainline', 'is', 'T'],
						 'AND',
						['type', 'anyof', 'RtnAuth'],
					  ],
					  columns: [
						colType,
						colId,
					  ],
					});
					
					// Note: Search.run() is limited to 4,000 results
					 objRMASearch.run().each(function(result){
						
						log.debug("RMA result", JSON.stringify(result));
						recordId = result.getValue(colId);
						log.debug("recordId", recordId)
						return false;
					 });
				return recordId;	
			}catch(ex){
				log.error("Error getting RMA details", ex.message);
				return "";
			}
		}

		function UpdateInSalesForce(dataObj){

			var errMsg = '',count=0;
			var itemExtId = '';
			var inputData ={};

          	var recId = dataObj.recId;
          	var recType = dataObj.tranType;
          	var tranDate = dataObj.tranDate;
          	var shipDate = dataObj.shipDate;
          	log.debug('shipDate in SF :',shipDate);
          	var invtNumArr = dataObj.invtNumArr;
          	var packageTrackingId = dataObj.packageTrackingId;
          	log.debug('packageTrackingId :',packageTrackingId);
          	var packageTrackingNo = dataObj.packageTrackingNo;
          	log.debug('packageTrackingNo :',packageTrackingNo);
          	var externalId = dataObj.externalId;

			var access_token = "";
			var instance_url = "";
			var objTokenDetails = library.GetToken();
			if(objTokenDetails){
				if(objTokenDetails.token){
					access_token = objTokenDetails.token;
				}
				if(objTokenDetails.url){
					instance_url = objTokenDetails.url;
				}
			}
			var authorizationToken  = "Bearer " + access_token;
			log.debug("instance_url", instance_url);

			tranDate = parseAndFormatDateString(tranDate);
			//log.debug('tranDate 1 : ',tranDate);
			var values = tranDate.split("/");
			var date = values[1];
			var month = values[0];
			var year = values[2];
			tranDate = year + "-" + month + "-" + date;
			log.debug('tranDate 2 : ',tranDate);

          	shipDate = parseAndFormatDateString(shipDate);
			//log.debug('tranDate 1 : ',tranDate);
			var shipValues = shipDate.split("/");
			var sdate = shipValues[1];
			var smonth = shipValues[0];
			var syear = shipValues[2];
			shipDate = syear + "-" + smonth + "-" + sdate;
			log.debug('shipDate 2 : ',shipDate);

			for(var a=0; a<invtNumArr.length; a++){

				itemExtId 		= invtNumArr[a].itemExtId;
				log.debug('item externalId : ',itemExtId);
				var serialNums 	= invtNumArr[a].serials;
				log.debug('item serialNums : ',serialNums);
				var lotNums 	= invtNumArr[a].lots;
				log.debug('item lotNums : ',lotNums);

				try{

					if(itemExtId) {
						//update the sobject logic here

						if(recType=='itemfulfillment'){
							inputData["NS_IF_Line_Item_Id__c"] = recId;
							inputData["NS_Ship_Date__c"] = shipDate; //tranDate;
						}else{
							inputData["NS_IR_Line_Item_Id__c"] = recId;
							inputData["NS_Received_Date__c"] = tranDate;
						}
						inputData["NS_Item_Serial__c"] = serialNums;
						inputData["NS_Item_Lot__c"] = lotNums;

						var theUrl = instance_url + "/services/data/v52.0/sobjects/OrderItem/"+itemExtId+"?_HttpMethod=PATCH";
                        log.debug("theUrl : ", theUrl);

						var params =JSON.stringify(inputData);
						log.debug("params", params);

						var headers = {
							"Content-Type": "application/json",
							"Authorization": authorizationToken,
							"Content-Length": params.length
						};
						var sfdcResponse = https.post({
							url: theUrl,
							body: params,
							headers: headers
						});
						log.debug("SFDC Response", sfdcResponse);
						var updateCustCode = sfdcResponse.code;
						log.debug("updateCustCode", updateCustCode);
						if(updateCustCode == '200' || updateCustCode == '201'|| updateCustCode == '204') {
							var updateCustBody = sfdcResponse.body;
							log.debug("updateCustBody", updateCustBody);
							log.debug("updateCustCode", updateCustCode);

						}else {
							log.debug("status", "Error occured in Salesforce");
							var updateCustBody = sfdcResponse.body;
							log.debug("updateCustBody", updateCustBody);
							errMsg += "Error in updating Item in  Sf "+externalId+" -> for IR/IF record updation: ";
							errMsg += updateCustBody;
							errMsg += '\n';
						}
					}
                  	log.debug('externalId && count && recType : ',externalId +' && '+count +' && '+ recType);
                  	if(externalId && packageTrackingId && count==0){
                      	if(recType=='itemfulfillment'){
                          	var inputObj = {};
                          	inputObj["NS_Shipment_Confirmation_Link__c"] = 'https://5054041.app.netsuite.com/app/common/shipping/packagetracker.nl?id='+packageTrackingId;
                          	inputObj["NS_Package_Tracking_Number__c"] = packageTrackingNo;
                          	inputObj["NS_Order_Ship_Date__c"] = shipDate;

                          	var url = instance_url + "/services/data/v52.0/sobjects/Order/"+externalId+"?_HttpMethod=PATCH";
                            log.debug("url : ", url);

                            var inputParams =JSON.stringify(inputObj);
                            log.debug("inputParams", inputParams);

                            var headers = {
                                "Content-Type": "application/json",
                                "Authorization": authorizationToken,
                                "Content-Length": inputParams.length
                            };
                            var sfdcResponse = https.post({
                                url: url,
                                body: inputParams,
                                headers: headers
                            });
                            log.debug("SFDC Response for IF", sfdcResponse);
                            var updateCustCode = sfdcResponse.code;
                            log.debug("updateCustCode", updateCustCode);
                            if(updateCustCode == '200' || updateCustCode == '201'|| updateCustCode == '204') {
                                var updateCustBody = sfdcResponse.body;
                                log.debug("updateCustBody", updateCustBody);
                                log.debug("updateCustCode", updateCustCode);

                            }else {
                                log.debug("status", "Error occured in Salesforce");
                                var updateCustBody = sfdcResponse.body;
                                log.debug("updateCustBody", updateCustBody);
                                errMsg += "Error in updating Item in  Sf "+externalId+" -> for IR/IF record updation: ";
                                errMsg += updateCustBody;
                                errMsg += '\n';
                            }
                          	count++;
                        }
                    }

				}catch(e){
					log.debug('Exception during Receipt/Fulfill update in saleforce : ',e.message);
					log.debug("errorMessage", e.message);
					//nlapiLogExecution('DEBUG','Failed','Fail errorMessage'+e.getMessage);
					errMsg += "Error in Item Sf ID "+externalId+" -> IR/IF item record updation: ";
					errMsg += e.message;
					errMsg += '\n';
					continue;
				}

			}//End for loop	
		}

		function GetInventoryNoId(itemId,srNo){

			var invtId = 0;
			var inventorynumberSearchObj = search.create({
			   type: "inventorynumber",
			   filters:
			   [
					["item","anyof",itemId],
					"AND",
					["inventorynumber","is",srNo]
			   ],
			   columns:
			   [
					search.createColumn({
						name: "inventorynumber",
						sort: search.Sort.ASC,
						label: "Number"
					}),
					search.createColumn({name: "item", label: "Item"})
			   ]
			});
			var searchResultCount = inventorynumberSearchObj.runPaged().count;
			log.debug("inventorynumberSearchObj result count",searchResultCount);
			inventorynumberSearchObj.run().each(function(result){
			   // .run().each has a limit of 4,000 results
			   invtId = result.id;
			   return false;
			});

			return invtId;
		}

		function parseAndFormatDateString(date) {
			// Assume Date format is MM/DD/YYYY
			/*var parsedDateStringAsRawDateObject = format.parse({
						value: date,
						type: format.Type.DATE
					});*/
			var formattedDateString = format.format({
			  value: date,
			  type: format.Type.DATE
			});

			//return parsedDateStringAsRawDateObject;
			return formattedDateString;
		}

		return {
			afterSubmit: afterSubmit
		};
	});