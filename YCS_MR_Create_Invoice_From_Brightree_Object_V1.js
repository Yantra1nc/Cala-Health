/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
/**
 * Script Modification Log:
 *
    -- Date -- 					-- Modified By -- 					--Requested By-- 					-- Description --
    03 Jan 2023				    Ajay								Laxmi,Gautam				Create Invoice from Brightree search data.
 *
 */
 
 define(['N/search', 'N/record', 'N/config', 'N/runtime', 'N/format', 'N/log'],
    function(search, record, config, runtime, format, log) {

		/**
		* Marks the begining of the Map/Reduce process and generates input data.
		*
		* @typedef {Object} ObjectRef
		* @property {number} id - Internal ID of the record instance
		* @property {string} type - Record type id
		*
		* @return {Array|Object|Search|RecordRef} inputSummary
		* @since 2021.1
		*/
		function getInputData(){

          	var itemObj 		= GetOtherChargeItem();
          	var cutOverItemObj 	= GetCutOverItem();
          	//var recordItemObj	= GetSerializedInvtItem();
          	var recordItemArr	= GetSerializedInvtItem();
          	var arItemObj		= GetARItemData();

			var btResultArr = [];
			//script object to get value of script parameter
			var objScript  		= runtime.getCurrentScript();
			//Get Brightree Search id
			var btSearchId = objScript.getParameter({name:'custscript_ycs_bt_search_id'});
          	log.debug('btSearchId : ',btSearchId);
          	var btTaxId = objScript.getParameter({name:'custscript_ch_bt_tax_id'});
          	log.debug('btTaxId : ',btTaxId);

			try{

              	//Load Brightree Search
				var btSearchObj  = search.load({
					id: btSearchId
				});
				var searchResultCount = btSearchObj.runPaged().count;
				log.debug("btSearchObj result count",searchResultCount);

				var resultIndex = 0;
				var resultStep  = 1000;

				do{

					var startIndex = parseInt(resultIndex);
					var endIndex = parseInt(resultIndex) + parseInt(resultStep);
					log.debug('startIndex : endIndex : ',startIndex +' : '+endIndex);

					//Get invoice search results
					var searchResult = btSearchObj.run().getRange({
						start: startIndex,
						end: endIndex
					});

					// increase pointer
					resultIndex = parseInt(resultIndex) + parseInt(resultStep);

					//Check search result length
					if(searchResult.length > 0){

                      	var nextItemId = "";

						//Search Result loop
						for(var p=0; p< searchResult.length; p++){

                          	var arFlag = false;

							//Get Brightree Rec id
							var btId  = searchResult[p].id;
							//log.debug('btId :'+p,btId);
							//Get Brightree external id
							var btExtId  = searchResult[p].getValue({
							   name: 'custrecord_ch_sf_bright_table_ext_id'
							});
							//log.debug('btExtId :'+p,btExtId);
							//Get recType
							var recType  = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_transtype'
							});
							//log.debug('recType :'+p,recType);
							//Get soRecId
							var soRecId  = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_nsorderid'
							}) || "";
							//log.debug('soRecId :'+p,soRecId);
							//Get Brightree TranNo
							var btTranNo = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_transactionno'
							});
							//log.debug('btTranNo :'+p,btTranNo);
							//Get Brightree Order Id
							var btOrderId = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_btoderid'
							});
							//log.debug('btOrderId :'+p,btOrderId);
							//Get patientKey
							var patientKey = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_patientkey'
							});
							//log.debug('patientKey :'+p,patientKey);
							//Get patientId
							var patientId = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_patientid'
							});
							//log.debug('patientId :'+p,patientId);
							//Get patientName
							var patientName = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_patientname'
							});
							//log.debug('patientName :'+p,patientName);
							//Get Brightree insurance name
							var insuranceName = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_insurername'
							});
							//log.debug('insuranceName :'+p,insuranceName);
							//Get payorLevel
							var payorLevel = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_payorlevel'
							});
							//log.debug('payorLevel :'+p,payorLevel);
							//Get patientBranch
							var patientBranch = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_patientbranch'
							});
							//log.debug('patientBranch :'+p,patientBranch);
							//Get btCity
							var btCity = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_city'
							});
							//log.debug('btCity :'+p,btCity);
							//Get Brightree State
							var btState = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_state'
							});
							//log.debug('btState :'+p,btState);
							//Get Brightree zipcode
							var btZipCode = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_zipcode'
							});
							//log.debug('btZipCode :'+p,btZipCode);
							//Get Brightree btApplAmt
							var btApplAmt = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_amount'
							});
							//log.debug('btApplAmt :'+p,btApplAmt);
							//Get Brightree processed
							var btProcessed = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_processed'
							});
							//log.debug('btProcessed :'+p,btProcessed);
							//Get Brightree Date processed
							var btDateProcessed = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_dateprocessed'
							});
							//log.debug('btDateProcessed :'+p,btDateProcessed);
							//Get Brightree applied to from
							var btAppliedToFrom = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_appliedtofrom'
							});
							//log.debug('btAppliedToFrom :'+p,btAppliedToFrom);
							//Get tranDate
							var tranDate  = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_date'
							}) || "";
							//log.debug('tranDate :'+p,tranDate);
                            //Get date of service
							var dateOfService  = searchResult[p].getValue({
							   name: 'custrecord_ch_date_service'
							}) || "";
							//log.debug('dateOfService :'+p,dateOfService);
							//Get itemId
							var itemId  = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_itemid'
							});
							//log.debug('itemId :'+p,itemId);
							//Get itemName
							var itemName  = searchResult[p].getText({
							   name: 'custrecord_ch_bt_itemid'
							});
							log.debug('itemName :'+p,itemName);
							//Get itemOldName
							var itemOldName  = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_itemname'
							});
							//log.debug('itemOldName :'+p,itemOldName);
							//Get itemQty
							var itemQty  = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_quantity'
							});
							//log.debug('itemQty :'+p,itemQty);
							//Get itemRate
							var itemRate  = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_rate'
							});
							//log.debug('itemRate :'+p,itemRate);
							//Get itemAmt
							var itemAmt  = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_amount'
							});
							//log.debug('itemAmt :'+p,itemAmt);
							//Get itemDesc
							var itemDesc  = searchResult[p].getValue({
							   name: 'custrecord_ch_bt_itemdescription'
							});
							//log.debug('itemDesc :'+p,itemDesc);
                          	//Get payment type
							var btPaymentType  = searchResult[p].getValue({
							   name: 'custrecord_ch_payment_type'
							}) || "";
							//log.debug('btPaymentType :'+p,btPaymentType);

                            //Get BT payment date
							var btPaymentDate  = searchResult[p].getValue({
							   name: 'custrecord_bt_payment_date'
							}) || "";
							//log.debug('btPaymentDate :'+p,btPaymentDate);
                            //Get BT invoice created date
							var btInvCreatedDate  = searchResult[p].getValue({
							   name: 'custrecord_cl_invoice_created_date'
							}) || "";
							//log.debug('btInvCreatedDate :'+p,btInvCreatedDate);

                          	if(soRecId !="" && recType!='Tax'){
                                //itemId      = arItemObj[itemName];
                                //log.debug('itemId in AR 0 : ',itemId);
                                //arFlag		= true;
								//itemId  	= recordItemObj[itemName];
                              	var itemData  = recordItemArr.filter(function (entry) { return entry.itemName === String(itemName); });
								log.debug('itemData input & length : ',itemData+' && '+itemData.length);
								if(itemData.length > 1){
									itemId		= itemData[0]["itemId"];
									nextItemId	= itemData[1]["itemId"];
								}else if(itemData.length > 0){
									itemId		= itemData[0]["itemId"];
								}else if(itemData.length == 0){
                                    itemId      = arItemObj[itemName];
                                    log.debug('itemId in AR 0 : ',itemId);
                                    arFlag		= true;
                                }
                              	log.debug('itemId & nextItemId input : ',itemId+' && '+nextItemId);
            
                              	if(recType=='Write-Off' || recType=='Write-Off Allowable' || recType=='Adjust Allowable' || recType=='Credit Adjustment' || (recType=='Balance Transfer' && btAppliedToFrom=='')){
									itemId  	= arItemObj[itemName];
                                    log.debug('itemId in AR : ',itemId);
                                  	arFlag		= true;
								}
                                
							}else{
								if(tranDate){
									var btTranDate	= parseAndFormatDateString(tranDate);
									var febDate6	= new Date('2/6/2023');
									log.debug('btTranDate & febDate6 :',btTranDate+' && '+febDate6);

									if(btTranDate < febDate6){
                                      	log.debug('less date');
										if(!itemId){
											itemName 	= cutOverItemObj[itemOldName];
											log.debug('cutover Item Name :',itemName);
										}
										itemId  	= itemObj[itemName];
									}else{
                                      	log.debug('greater date with itemName :',itemName);
										itemId  	= arItemObj[itemName];
                                      	log.debug('itemId in condition : ',itemId);
                                      	arFlag		= true;
									}
								}else{
									itemId  	= arItemObj[itemName];
                                  	arFlag		= true;
								}
							}
                          	if(recType=='Tax'){
                              	itemId  = btTaxId;
                                //itemId  	= arItemObj[itemName];
                                log.debug('tax itemId : ',itemId);
                            }

							var btData = {
								"btId":btId,
                              	"btExtId":btExtId,
                              	"recType":recType,
								"soRecId":soRecId,
                              	"btTranNo":btTranNo,
                              	"btOrderId":btOrderId,
                              	"patientKey":patientKey,
								"patientId":patientId,
								"patientName":patientName,
								"insuranceName":insuranceName,
								"payorLevel":payorLevel,
								"patientBranch":patientBranch,
								"btCity":btCity,
								"btState":btState,
								"btZipCode":btZipCode,
                              	"btApplAmt":btApplAmt,
								"btProcessed":btProcessed,
								"btDateProcessed":btDateProcessed,
								"btAppliedToFrom":btAppliedToFrom,
								"tranDate":tranDate,
                                "dateOfService":dateOfService,
                              	"arFlag":arFlag,
								"itemId":itemId,
                              	"nextItemId":nextItemId,
                              	"itemName":itemName,
								"itemQty":itemQty,
								"itemRate":itemRate,
                              	"itemAmt":itemAmt,
								"itemDesc":itemDesc,
                              	"btPaymentType":btPaymentType,
                                "btPaymentDate":btPaymentDate,
                                "btInvCreatedDate":btInvCreatedDate,
                                "arItemObj":arItemObj
							};

							//btResultArr.push({"soRecId":soRecId,"btData":btData});
							btResultArr.push({"btTranNo":btTranNo,"btData":btData});

						}//End searchResult for loop

					}else if(searchResult.length == 0){
						log.debug('btResultArr.length : ',btResultArr.length);
                      	log.debug('btResultArr : ',btResultArr);
						return btResultArr;

					}//End SearchResult condition

				}while(searchResult.length > 0);

			}catch(e){
				log.debug("Exception in input is :",e.message);
			}
		}

	   /**
		* Executes when the map entry point is triggered and applies to each key/value pair.
		*
		* @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		* @since 2021.1
		*/
		function map(context) {
			try {
				//log.debug('JSON.parse(context.value) in map : ',JSON.parse(context.value));
				var key   = JSON.parse(context.value).btTranNo;
				var value = JSON.parse(context.value).btData;

				context.write(key,value);
			} catch(error) {
				log.error({title: 'Error in map()', details: error});
			}
		}

	  /**
		* Executes when the reduce entry point is triggered and applies to each group.
		*
		* @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		* @since 2021.1
		*/
		function reduce(context){

			try{

				var invLineItemArr    = [], bltLineItemArr    = [];
              	var bltNegLineItemArr = [], bltPosLineItemArr = [];
              	var taxNegLineItemArr = [], taxPosLineItemArr = [];
              	var invFlag = false, blFlag = false, count=100;
              	var taxFlag = false;

                var arItemObj   = JSON.parse(context.values[0]).arItemObj;

				var btTranNo 	= JSON.parse(context.key);
				log.debug('context key btTranNo in reduce : ', btTranNo);
				log.debug('context.values.length : ',context.values.length);

              	var btOrderId	= JSON.parse(context.values[0]).btOrderId || "";
				var soRecId		= JSON.parse(context.values[0]).soRecId || "";
				//log.debug('soRecId : ',soRecId);
              	if(soRecId == ""){
					soRecId		= GetBT_SORecord(btOrderId);
				}

              	for(var a=0; a<context.values.length; a++){

					try{

						var cmLineItemArr = [], paymentDataArr = [], appPaymentDataArr = [];
                      	var crLineItemArr = [];

                        var invCreatedDate = JSON.parse(context.values[a]).invCreatedDate;
                        if(invCreatedDate){
							invCreatedDate = parseAndFormatDateString(invCreatedDate);
						}
						//log.debug('invCreatedDate : ',invCreatedDate);
						var tranDate	= JSON.parse(context.values[a]).tranDate;
                      	var btDate		= tranDate;
						//log.debug('tranDate : ',tranDate);
						if(tranDate){
							tranDate	= parseAndFormatDateString(tranDate);
						}
						//log.debug('tranDate 1: ',tranDate);
                      	var dateOfService	= JSON.parse(context.values[a]).dateOfService;
                      	var btDateOfService	= dateOfService;
						//log.debug('btDateOfService : ',btDateOfService);
						if(dateOfService){
							dateOfService	= parseAndFormatDateString(dateOfService);
						}
						//log.debug('dateOfService 1: ',dateOfService);

                        var btPaymentDate= JSON.parse(context.values[a]).btPaymentDate;
						if(btPaymentDate){
							btPaymentDate= parseAndFormatDateString(btPaymentDate);
						}
                        log.debug('btPaymentDate in reduce : ',btPaymentDate);

                        var btInvCreatedDate= JSON.parse(context.values[a]).btInvCreatedDate;
						if(btInvCreatedDate){
							btInvCreatedDate= parseAndFormatDateString(btInvCreatedDate);
						}

                        btTranNo		= JSON.parse(context.values[a]).btTranNo;
						//log.debug('btTranNo : ',btTranNo);
						var patientKey	= JSON.parse(context.values[a]).patientKey;
						//log.debug('patientKey: ',patientKey);
						var patientId	= JSON.parse(context.values[a]).patientId;
						//log.debug('patientId : ',patientId);
						var patientName	= JSON.parse(context.values[a]).patientName;
						//log.debug('patientName : ',patientName);
						var insuranceName= JSON.parse(context.values[a]).insuranceName;
						//log.debug('insuranceName : ',insuranceName);
						var payorLevel	= JSON.parse(context.values[a]).payorLevel;
						//log.debug('payorLevel : ',payorLevel);
						var patientBranch= JSON.parse(context.values[a]).patientBranch;
						//log.debug('patientBranch : ',patientBranch);
						var btCity		= JSON.parse(context.values[a]).btCity;
						//log.debug('btCity : ',btCity);
						var btState		= JSON.parse(context.values[a]).btState;
						//log.debug('btState : ',btState);
						var btZipCode	= JSON.parse(context.values[a]).btZipCode;
						//log.debug('btZipCode : ',btZipCode);
						var btApplAmt	= JSON.parse(context.values[a]).btApplAmt;
						//log.debug('btApplAmt : ',btApplAmt);
						var btApplToFrom	= JSON.parse(context.values[a]).btAppliedToFrom;
						//log.debug('btApplToFrom : ',btApplToFrom);

						var recType		= JSON.parse(context.values[a]).recType;
                      	//log.debug('recType : ',recType);
						var btId		= JSON.parse(context.values[a]).btId;
						var btExtId		= JSON.parse(context.values[a]).btExtId;
						var itemId		= JSON.parse(context.values[a]).itemId;
                      	var nextItemId	= JSON.parse(context.values[a]).nextItemId;
                      	var itemName	= JSON.parse(context.values[a]).itemName;
						var itemQty		= JSON.parse(context.values[a]).itemQty || 0;
						var itemRate	= JSON.parse(context.values[a]).itemRate;
                      	var itemAmt		= JSON.parse(context.values[a]).itemAmt || 0;
						var itemDesc	= JSON.parse(context.values[a]).itemDesc;
                      	var btPaymentType= JSON.parse(context.values[a]).btPaymentType;
                      	var arFlag		= JSON.parse(context.values[a]).arFlag;

						var customData 	= {
							"tranDate":tranDate,
                          	"dateOfService":dateOfService,
                            "invCreatedDate":invCreatedDate,
                          	"btTranType":recType,
							"btTranNo":btTranNo,
                          	"btOrderId":btOrderId,
							"patientKey":patientKey,
							"patientId":patientId,
							"patientName":patientName,
							"insuranceName":insuranceName,
							"payorLevel":payorLevel,
							"patientBranch":patientBranch,
							"btCity":btCity,
							"btState":btState,
							"btZipCode":btZipCode,
							"btApplAmt":btApplAmt,
							"btApplToFrom":btApplToFrom,
                            "btPaymentDate":btPaymentDate,
                            "btInvCreatedDate":btInvCreatedDate
						}

						if(recType=='Invoice'){
							invLineItemArr.push({"btId":btId,"btExtId":btExtId,"arFlag":arFlag,"itemId":itemId,"nextItemId":nextItemId,"itemName":itemName,"itemQty":itemQty,"itemRate":itemRate,"itemAmt":itemAmt,"itemDesc":itemDesc,"tranDate":btDate,"btPaymentType":btPaymentType});
							invFlag = true;
							//CreateInvoiceRecord(soRecId,customData,invLineItemArr);
						}else if(recType=='Tax'){
							if(itemAmt < 0){
								taxNegLineItemArr.push({"btId":btId,"btExtId":btExtId,"itemId":itemId,"itemName":itemName,"itemQty":itemQty,"itemRate":itemRate,"itemAmt":itemAmt,"itemDesc":itemDesc,"btPaymentType":btPaymentType});
								CreateStandAloneCreditMemo(patientId,soRecId,customData,taxNegLineItemArr,arItemObj)
							}
							else if(itemAmt > 0){
								taxPosLineItemArr.push({"btId":btId,"btExtId":btExtId,"btApplToFrom":btApplToFrom,"itemId":itemId,"nextItemId":nextItemId,"itemName":itemName,"itemQty":itemQty,"itemRate":itemRate,"itemAmt":itemAmt,"itemDesc":itemDesc,"tranDate":btDate,"btPaymentType":btPaymentType});
								taxFlag = true;
							}
							//CreateInvoiceRecord(soRecId,customData,invLineItemArr);
						}else if(recType=='Balance Transfer'){
							//count++;
							bltLineItemArr.push({"btId":btId,"btExtId":btExtId,"itemId":itemId,"nextItemId":nextItemId,"itemName":itemName,"itemQty":itemQty,"itemRate":itemRate,"itemAmt":itemAmt,"itemDesc":itemDesc,"btApplAmt":btApplAmt,"tranDate":btDate,"btPaymentType":btPaymentType});
                          if(itemAmt < 0){
							bltNegLineItemArr.push({"btId":btId,"btExtId":btExtId,"itemId":itemId,"nextItemId":nextItemId,"itemName":itemName,"itemQty":itemQty,"itemRate":itemRate,"itemAmt":itemAmt,"itemDesc":itemDesc,"btApplAmt":btApplAmt,"tranDate":btDate,"btPaymentType":btPaymentType});
                          }else if(itemAmt > 0){
                            bltPosLineItemArr.push({"btId":btId,"btExtId":btExtId,"itemId":itemId,"nextItemId":nextItemId,"itemName":itemName,"itemQty":itemQty,"itemRate":itemRate,"itemAmt":itemAmt,"itemDesc":itemDesc,"btApplAmt":btApplAmt,"tranDate":btDate,"btPaymentType":btPaymentType});
                          }
							//blFlag = CreateCreditMemo(soRecId,customData,cmLineItemArr,count);
                          	//if(blFlag==true){
								//CreateBLInvoiceRecord(soRecId,customData,cmLineItemArr);
							//}
                          	blFlag=true;
						}else if(recType=='Adjust Allowable'){
							//count++;
							cmLineItemArr.push({"btId":btId,"btExtId":btExtId,"itemId":itemId,"nextItemId":nextItemId,"itemName":itemName,"itemQty":itemQty,"itemRate":itemRate,"itemAmt":itemAmt,"itemDesc":itemDesc,"btApplAmt":btApplAmt,"btPaymentType":btPaymentType});
							//CreateCreditMemo(soRecId,customData,cmLineItemArr);
                          	if(itemAmt < 0){
								CreateStandAloneInvoiceRecord(soRecId,customData,cmLineItemArr);
							}else if(itemAmt > 0){
                              	CreateCreditMemo(soRecId,customData,cmLineItemArr,arItemObj);
                            }
						}else if(recType=='Credit Adjustment'){
							//count++;
							cmLineItemArr.push({"btId":btId,"btExtId":btExtId,"itemId":itemId,"nextItemId":nextItemId,"itemName":itemName,"itemQty":itemQty,"itemRate":itemRate,"itemAmt":itemAmt,"itemDesc":itemDesc,"btApplAmt":btApplAmt,"btPaymentType":btPaymentType});
							//CreateCreditMemo(soRecId,customData,cmLineItemArr);
                          	if(itemAmt < 0){
								CreateStandAloneInvoiceRecord(soRecId,customData,cmLineItemArr);
							}else if(itemAmt > 0){
                              	CreateCreditMemo(soRecId,customData,cmLineItemArr,arItemObj);
                            }
						}else if(recType=='Write-Off' || recType=='Write-Off Allowable' || recType=='WriteOff Allowable'){
							cmLineItemArr.push({"btId":btId,"btExtId":btExtId,"itemId":itemId,"nextItemId":nextItemId,"itemName":itemName,"itemQty":itemQty,"itemRate":itemRate,"itemAmt":itemAmt,"itemDesc":itemDesc,"btApplAmt":btApplAmt,"btPaymentType":btPaymentType});
							//CreateCreditMemo(soRecId,customData,cmLineItemArr);
                          	if(itemAmt < 0){
								CreateStandAloneInvoiceRecord(soRecId,customData,cmLineItemArr);
							}else if(itemAmt > 0){
                              	CreateCreditMemo(soRecId,customData,cmLineItemArr,arItemObj);
                            }
						}
                      	else if(recType=='Applied Payment'){
							appPaymentDataArr.push({"btId":btId,"btExtId":btExtId,"btAppliedToFrom":btApplToFrom});
							CreateCustomerPayment(soRecId,customData,appPaymentDataArr);
						}
                      	else if(recType=='Payment'){
							paymentDataArr.push({"btId":btId,"btExtId":btExtId,"btAppliedToFrom":btApplToFrom});
							CreateCustomerPayment(soRecId,customData,paymentDataArr);
						}
                      	else if(recType=='Refund'){
                          	var refundFlag = false;
							crLineItemArr.push({"btId":btId,"btExtId":btExtId,"itemId":itemId,"nextItemId":nextItemId,"itemName":itemName,"itemQty":itemQty,"itemRate":itemRate,"itemAmt":Math.abs(itemAmt),"itemDesc":itemDesc,"btApplAmt":btApplAmt,"btPaymentType":btPaymentType});
							//CreateCustomerRefund(soRecId,customData,btId,btExtId,btApplToFrom);
                          	if(btApplToFrom){
								refundFlag = CreateCustomerRefund(soRecId,customData,btId,btExtId,btApplToFrom);
                              	log.debug('refundFlag : ',refundFlag);
                              	if(refundFlag==false){
									CreateCreditMemo(soRecId,customData,crLineItemArr,arItemObj);
								}
							}else{
								//crLineItemArr.push({"btId":btId,"btExtId":btExtId,"itemId":itemId,"itemName":itemName,"itemQty":itemQty,"itemRate":itemRate,"itemAmt":Math.abs(itemAmt),"itemDesc":itemDesc,"btApplAmt":btApplAmt});
								CreateCreditMemo(soRecId,customData,crLineItemArr,arItemObj);
							}
						}
						//log.debug('paymentLineItemArr : ',paymentLineItemArr);

						if(a==context.values.length-1){

                          	var invRecId = 0, inv_BTDate = "", bl_BTDate = "";
							log.debug('invFlag & blFlag : ',invFlag +' & '+blFlag);
                          	log.debug('bltLineItemArr : ',bltLineItemArr);
                            log.debug('soRecId & arFlag : ',soRecId + ' & '+arFlag);
							if(invFlag==true){

                                for(var f=0; f<invLineItemArr.length; f++){
                                    if(invLineItemArr[f].arFlag==false){
                                         arFlag = false;
                                         break;
                                    }
                                }
                                log.debug('revised arFlag : ',arFlag);

								if(soRecId !=""){
                                    if(arFlag==true){
                                        CreateStandAloneInvoiceRecord(soRecId,customData,invLineItemArr);
                                    }else{
                                        invRecId = CreateInvoiceRecord(soRecId,customData,invLineItemArr,arItemObj);
                                    }
									
								}else{
									invRecId = CreateStandAloneInvoiceRecord(soRecId,customData,invLineItemArr);
								}

                              	inv_BTDate	= invLineItemArr[0].tranDate;

							}if(blFlag==true){

                              	bl_BTDate	= bltLineItemArr[0].tranDate;
								log.debug('bl_BTDate in final : ',bl_BTDate);
                              	log.debug('inv_BTDate in final : ',inv_BTDate);
                              	log.debug('invRecId in final : ',invRecId);

								if(inv_BTDate==bl_BTDate && invRecId > 0){

                                  	log.debug('Update Invoice Start');
									UpdateInvoice(invRecId,bltLineItemArr);

								}else if(inv_BTDate!=bl_BTDate){

                                  	//for(var b=0; b < bltLineItemArr.length; b++){
                                      	log.debug('bltNegLineItemArr : ',bltNegLineItemArr);
                                  		log.debug('bltPosLineItemArr : ',bltPosLineItemArr);
                                      	if(bltNegLineItemArr.length > 0){
                                          	CreateBLInvoiceRecord(soRecId,customData,bltNegLineItemArr);
                                        }
                                      	if(bltPosLineItemArr.length > 0){
                                          	CreateCreditMemo(soRecId,customData,bltPosLineItemArr,arItemObj);
                                        }

                                    //}

                                    //var itemQtyObj = CreateCreditMemo(soRecId,customData,bltLineItemArr);
                                    //blFlag = itemQtyObj["flag"];
                                    //if(blFlag==true){
                                        //CreateBLInvoiceRecord(soRecId,customData,bltLineItemArr,itemQtyObj);
                                    //}
                                }

							}/*else if(cmFlag==true){

								CreatecreditMemo(soRecId,customData,cmLineItemArr);
							}*/
                          	if(taxFlag==true){
								log.debug("taxPosLineItemArr", JSON.stringify(taxPosLineItemArr));
								AddInvoiceTaxLine(soRecId,taxPosLineItemArr, customData);
							}
						}

					}catch(ee){
						log.debug('Loop exception : ',ee.message);
						var excepmsg= ee.message;
						var btFldId = record.submitFields({
							type: 'customrecord_ch_bt_staging',
							id: parseInt(btId),
							values: {
								custrecord_ch_bt_exception: excepmsg
							},
							options: {
								enableSourcing: false,
								ignoreMandatoryFields : true
							}
						});

					}

				}//End for loop

			}catch (ex) {
				log.debug('Reduce catch error is : ', ex.message);
			}
		}

	  /**
		* Executes when the summarize entry point is triggered and applies to the result set.
		*
		* @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
		* @since 2021.1
		*/
		function summarize(context) {
		  log.debug('completed summarize', ' ');
		  log.debug('End', new Date());
		}

   		function GetBT_SORecord(btOrderId){
			var soId = "";
			var salesorderSearchObj = search.create({
				type: "salesorder",
				filters:
				[
					["type","anyof","SalesOrd"], 
					"AND", 
					["mainline","is","T"], 
					"AND", 
					["custbody_ch__bt_order_id","is",btOrderId]
				],
				columns:
				[
					search.createColumn({name: "tranid", label: "Document Number"}),
					search.createColumn({name: "custbody_ch__bt_order_id", label: "BRIGHTREE ORDER ID"})
				]
			});
			var searchResultCount = salesorderSearchObj.runPaged().count;
			log.debug("salesorderSearchObj result count",searchResultCount);
			salesorderSearchObj.run().each(function(result){
				// .run().each has a limit of 4,000 results
				soId = result.id;
				return false;
			});
			return soId;
		}

   		function AddInvoiceTaxLine(soRecId,lineItemArr, customData){
			var flag = false, invRecId = "";
			try{
				log.debug("Inside AddInvoiceTaxLine() lineItemArr", JSON.stringify(lineItemArr));
				var btApplToFrom = lineItemArr[0].btApplToFrom || "";
				log.debug('btApplToFrom : ',btApplToFrom);
				if(btApplToFrom){

					invRecId = GetAppliedInvoice(btApplToFrom);
				}
				log.debug('Add tax in invoice id : ',invRecId);

				//Commented By Asha on 02/02/2023
				//if(invRecId == 0)
					//return;
				
				//Create standalone Invoice, if its not available
              	if(invRecId == ""){
					invRecId = CreateStandAloneInvoiceRecord(soRecId,customData, lineItemArr);
					
					if(invRecId > 0){
							log.debug("Successfully invoice record is created id with tax is : ",invRecId);
							var currDate = new Date();
							log.debug('lineItemArr Tax :',lineItemArr);
							for(var z=0; z < lineItemArr.length; z++){
								var fldId = record.submitFields({
									type: 'customrecord_ch_bt_staging',
									id: parseInt(lineItemArr[z].btId),
									values: {
										custrecord_ch_bt_bal_trf_inv: invRecId,
										custrecord_ch_bt_associated_inv: invRecId,
										custrecord_ch_bt_processed: true,
										custrecord_ch_bt_dateprocessed: currDate,
										custrecord_ch_bt_exception: ""
									},
									options: {
										enableSourcing: false,
										ignoreMandatoryFields : true
									}
								});

							}//End for loop
						}
				}else{
					//Load Invoice Record
					var invRecord = record.load({
						type: record.Type.INVOICE,
						id: invRecId,
						isDynamic: true
					});

					for(var x=0; x < lineItemArr.length; x++){

						var itemId 		= lineItemArr[x].itemId;
						var itemQty 	= lineItemArr[x].itemQty || 1;
						var itemRate 	= lineItemArr[x].itemRate;
						var itemDesc 	= lineItemArr[x].itemDesc;
						var itemAmt		= lineItemArr[x].itemAmt;
						var btId		= lineItemArr[x].btId;
						var btExtId		= lineItemArr[x].btExtId;

						//Select New Line
						invRecord.selectNewLine({
							sublistId: 'item'
						});

						//Set Line level discount item
						invRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'item',
							value: itemId,
							ignoreFieldChange: false
						});

						invRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'quantity',
							value: itemQty
						});

						invRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'description',
							value: itemDesc
						});

						invRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'rate',
							value: itemRate
						});

						invRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_ch_sfdc_bt_internal_id',
							value: btId
						});

						invRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'custcol_ch_sfdc_bt_ext_id',
							value: btExtId
						});

						invRecord.setCurrentSublistValue({
							sublistId: 'item',
							fieldId: 'amount',
							value: parseFloat(itemAmt)
						});

                      	invRecord.setCurrentSublistText({
							sublistId: 'item',
							fieldId: 'cseg_ch_payer',
							text: lineItemArr[x].btPaymentType
						});

						// Save the line in the item sublist.
						invRecord.commitLine({
							sublistId: 'item'
						});

						flag = true;

					}//End line item for loop
					log.debug('add tax inv flag : ',flag);

					if(flag==true){

						//Update Invoice record
						invRecId = invRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
						if(invRecId > 0){
							log.debug("Successfully updated invoice record id with tax is : ",invRecId);
							var currDate = new Date();
							log.debug('lineItemArr Tax :',lineItemArr);
							for(var z=0; z < lineItemArr.length; z++){
								var fldId = record.submitFields({
									type: 'customrecord_ch_bt_staging',
									id: parseInt(lineItemArr[z].btId),
									values: {
										custrecord_ch_bt_bal_trf_inv: invRecId,
										custrecord_ch_bt_associated_inv: invRecId,
										custrecord_ch_bt_processed: true,
										custrecord_ch_bt_dateprocessed: currDate,
										custrecord_ch_bt_exception: ""
									},
									options: {
										enableSourcing: false,
										ignoreMandatoryFields : true
									}
								});

							}//End for loop
						}

					}
				}
                 // return;

				

			}catch(ex){
				log.debug('Exception in Tax Invoice updation is : ',ex.message);
				for(var e=0; e < lineItemArr.length; e++){
					var fldId = record.submitFields({
						type: 'customrecord_ch_bt_staging',
						id: parseInt(lineItemArr[e].btId),
						values: {
							custrecord_ch_bt_exception: ex.message
						},
						options: {
							enableSourcing: false,
							ignoreMandatoryFields : true
						}
					});
				}
			}

		}

   		function UpdateInvoice(invRecId,lineItemArr){
            log.debug('Start update invoice');
			var flag = false;
			try{

				//Load Invoice Record
				var invRecord = record.load({
					type: record.Type.INVOICE,
					id: invRecId,
					isDynamic: true
				});

				for(var x=0; x < lineItemArr.length; x++){

					var itemId 		= lineItemArr[x].itemId;
					var itemQty 	= lineItemArr[x].itemQty || 1; //itemQtyObj[itemId];
					//var itemSrNoArr	= itemQtyObj[itemId+'_S'];
					//log.debug('itemSrNoArr :',itemSrNoArr);
					var itemRate 	= lineItemArr[x].itemRate;
					var itemDesc 	= lineItemArr[x].itemDesc;
					var itemAmt		= lineItemArr[x].itemAmt; //parseFloat(itemRate)*parseInt(itemQty);
					var btId		= lineItemArr[x].btId;
					var btExtId		= lineItemArr[x].btExtId;

					//Select New Line
					invRecord.selectNewLine({
						sublistId: 'item'
					});

					//Set Line level discount item
					invRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'item',
						value: itemId,
						ignoreFieldChange: false
					});

					invRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'quantity',
						value: itemQty
					});

					invRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'description',
						value: itemDesc
					});

					invRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'rate',
						value: itemRate
					});

					invRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_ch_sfdc_bt_internal_id',
						value: btId
					});

					invRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'custcol_ch_sfdc_bt_ext_id',
						value: btExtId
					});

					invRecord.setCurrentSublistValue({
						sublistId: 'item',
						fieldId: 'amount',
						value: (-1)*parseFloat(itemAmt)
					});

                  	invRecord.setCurrentSublistText({
						sublistId: 'item',
						fieldId: 'cseg_ch_payer',
						text: lineItemArr[x].btPaymentType
					});

					// Save the line in the item sublist.
					invRecord.commitLine({
						sublistId: 'item'
					});

					flag = true;

				}//End line item for loop
				log.debug('stand alone tax inv flag : ',flag);

				if(flag==true){

					//Update Invoice record
                    invRecId = invRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
                    if(invRecId > 0){
                        log.debug("Successfully updated invoice record id is : ",invRecId);
                      	var currDate = new Date();
                      	log.debug('lineItemArr BL :',lineItemArr);
                        for(var z=0; z < lineItemArr.length; z++){
                            var fldId = record.submitFields({
                                type: 'customrecord_ch_bt_staging',
                                id: parseInt(lineItemArr[z].btId),
                                values: {
                                    custrecord_ch_bt_bal_trf_inv: invRecId,
                                  	custrecord_ch_bt_associated_inv: invRecId,
                                  	custrecord_ch_bt_processed: true,
									custrecord_ch_bt_dateprocessed: currDate,
									custrecord_ch_bt_exception: ""
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields : true
                                }
                            });

                        }//End for loop
                    }

				}

			}catch(ex){
				log.debug('Exception in BL Invoice updation is : ',ex.message);
				for(var e=0; e < lineItemArr.length; e++){
					var fldId = record.submitFields({
						type: 'customrecord_ch_bt_staging',
						id: parseInt(lineItemArr[e].btId),
						values: {
							custrecord_ch_bt_exception: ex.message
						},
						options: {
							enableSourcing: false,
							ignoreMandatoryFields : true
						}
					});
				}
			}

		}

   		function CreateCreditMemo(soRecId,customData,cmLineItemArr,arItemObj){

          	try{

                log.debug('Start Credit Memo');
                log.debug('cmLineItemArr : ',cmLineItemArr);
                var cmFlag = false, flag = false;
                var itemQtyObj  = new Object();

                var tranDate	= customData.tranDate;
              	var dateOfService	= customData.dateOfService;
                var btTranType	= customData.btTranType;
                var btTranNo	= customData.btTranNo;
              	var btOrderId	= customData.btOrderId;//
                var patientKey	= customData.patientKey;
                var patientId	= customData.patientId;
                var patientName	= customData.patientName;
                var insuranceName= customData.insuranceName;
                var payorLevel	= customData.payorLevel;
                var patientBranch= customData.patientBranch;
                var btCity		= customData.btCity;
                var btState		= customData.btState;
                var btZipCode	= customData.btZipCode;
                var btApplToFrom= customData.btApplToFrom;
                var btApplAmt	= 0; //customData.btApplAmt;
                var btExtId		= cmLineItemArr[0].btExtId;
                var btId		= cmLineItemArr[0].btId;
                var btPaymentType= cmLineItemArr[0].btPaymentType;
                var btPaymentDate= customData.btPaymentDate;
                var btInvCreatedDate = customData.btInvCreatedDate;

              	log.debug('btApplToFrom : ',btApplToFrom);
				var invId		= "";
              	if(btApplToFrom){
                  	invId		= GetAppliedInvoice(btApplToFrom);
                }
                log.debug('invId in CM : ',invId);

                if(invId > 0){

                    var invItemDataArr = [];

                    //Load Invoice record
                    var invRec = record.load({
                        type: record.Type.INVOICE,
                        id: invId,
                        isDynamic: true
                    });

                    var invLoc = invRec.getValue({fieldId:'location'});
                    log.debug('invLoc : ',invLoc);

                    //Get Item sublist Line count of an invoice
                    var invLineCount = invRec.getLineCount({sublistId: 'item'});
                    log.debug('invLineCount : ',invLineCount);

                    for(var z=0; z<invLineCount; z++){

                        //Select item sublist per line number
                        invRec.selectLine({sublistId: 'item',line: z});

                        var invLine 	= parseInt(invRec.getCurrentSublistValue({sublistId: 'item',fieldId: 'line'}));
                        //log.debug('invLine : ',invLine);
                        var invItemId 	= invRec.getCurrentSublistValue({sublistId: 'item',fieldId: 'item'});
                        //log.debug('invItemId : ',invItemId);
                        var isInvtDetail= invRec.getCurrentSublistValue({sublistId: 'item',fieldId: 'inventorydetailavail'});
                        log.debug('isInvtDetail : ',isInvtDetail);

                        var srNo = "";

                        if(isInvtDetail=="T"){

                            // Get the subrecord for that line.
                            var subrec = invRec.getCurrentSublistSubrecord({
                                sublistId: 'item',
                                fieldId: 'inventorydetail'
                            });

                            var invInvtDtlLineCount = subrec.getLineCount({sublistId: 'inventoryassignment'});
                            log.debug('invInvtDtlLineCount : ',invInvtDtlLineCount);

                            for(var k=0; k < invInvtDtlLineCount; k++){

                                //Select item sublist per line number
                                subrec.selectLine({sublistId: 'inventoryassignment',line: k});
                                srNo = subrec.getCurrentSublistText({
                                    sublistId: 'inventoryassignment',
                                    fieldId: 'issueinventorynumber'
                                });
                                //log.debug("srNo : "+k,srNo);

                                invItemDataArr.push({"invItemId":invItemId,"srNo":srNo});
                            }

                        }else{
                            invItemDataArr.push({"invItemId":invItemId,"srNo":srNo});
                        }

                    }//End for loop

                    log.debug('invItemDataArr : ',invItemDataArr);

                    //Transform invoice to credit memo record
                    var cmRecord = record.transform({
                        fromType: record.Type.INVOICE,
                        fromId: parseInt(invId),
                        toType: record.Type.CREDIT_MEMO,
                        isDynamic: true
                    });

                    cmRecord.setValue({fieldId:'location',value:invLoc});

                    //Get Item sublist Line count of credit memo
                    var cmLineCount = cmRecord.getLineCount({sublistId: 'item'});
                    log.debug('cmLineCount : ',cmLineCount);

                    //Loop through all lines to set received item of credit memo
                    for(var p=cmLineCount-1; p > -1; p--){

                        var lineItemQty = 0;

                        //Select item sublist per line number
                        cmRecord.selectLine({sublistId: 'item',line: p});

                        var line 		= parseInt(cmRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'line'}));
                        //log.debug('line : ',line);
                        var itemId 		= cmRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'item'});
                        //log.debug('itemId Inv : ',itemId);
                        var invItemQty 	= cmRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'quantity'});
                        //log.debug('invItemQty : ',invItemQty);
                      	var invItemInvtDtl 	= cmRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'inventorydetailavail'});
                        //log.debug('invItemInvtDtl : ',invItemInvtDtl);
                        var lineData  	= cmLineItemArr.filter(function (entry) { return entry.itemId === itemId; });
                        log.debug('lineData Inv : ',lineData);

                        if(lineData.length > 0){

                            //var itemAmt = parseFloat(lineData[0].itemRate)*parseInt(lineData[0].itemQty);
                            //log.debug('itemAmt : ',itemAmt);

                            if(lineData[0].itemQty==0){
                                cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: invItemQty,ignoreFieldChange: false});
                                lineItemQty= invItemQty;
                                itemQtyObj[itemId] = lineItemQty;
                            }else{
                                cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: lineData[0].itemQty,ignoreFieldChange: false});
                                lineItemQty= lineData[0].itemQty;
                                itemQtyObj[itemId] = lineItemQty;
                            }
							var memoAmount = Math.abs(parseFloat(lineData[0].btApplAmt));
							log.debug("memoAmount", memoAmount);
                            //cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: lineData[0].itemQty,ignoreFieldChange: false});
                            //cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'rate',value: lineData[0].itemRate,ignoreFieldChange: false});
                            //cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'amount',value: parseFloat(btApplAmt),ignoreFieldChange: false});
                            cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'amount',value: memoAmount,ignoreFieldChange: false});
                            //cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'description',value: lineData[0].itemDesc,ignoreFieldChange: true});
                            cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_bt_internal_id',value: lineData[0].btId,ignoreFieldChange: true});
                            cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_bt_ext_id',value: lineData[0].btExtId,ignoreFieldChange: true});
                          	cmRecord.setCurrentSublistText({sublistId: 'item',fieldId: 'cseg_ch_payer',text: lineData[0].btPaymentType,ignoreFieldChange: true});//
                            if(tranDate){
                                cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_bt_tran_date_col',value: tranDate,ignoreFieldChange: true});//
                            }
                            cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_tran_type_line',value: btTranType,ignoreFieldChange: true});//

                            btApplAmt = parseFloat(btApplAmt)+ parseFloat(lineData[0].btApplAmt);

                          	/*if(invItemInvtDtl=="T"){
                                var cmLineData  = invItemDataArr.filter(function (entry) { return entry.invItemId === itemId; });
                                //log.debug('cmLineData Inv : ',cmLineData);
                                if(cmLineData.length > 0){
                                //for(var s=0; s < cmLineData.length; s++){
                                    //if(cmLineData[s]["srNo"]!=""){

                                        //var cmSrNo = "CMX_"+count+"_"+cmLineData[s]["srNo"];
                                        //var cmSrNo = cmLineData[0]["srNo"];
                                        //log.debug('cmSrNo : ',cmSrNo);

                                        //Configure inventory detail
                                        // Get the subrecord for that line.
                                        var invtSubRec = cmRecord.getCurrentSublistSubrecord({
                                            sublistId: 'item',
                                            fieldId: 'inventorydetail'
                                        });

                                        //Get Item sublist Line count of credit memo
                                        var cmInvtLineCount = invtSubRec.getLineCount({sublistId: 'inventoryassignment'});
                                        log.debug('cmInvtLineCount && lineItemQty : ',cmInvtLineCount +' && '+ lineItemQty);

                                        var itemSerialNoArr = [];

                                        for(var xx=0; xx < cmInvtLineCount; xx++){

                                            invtSubRec.selectLine({
                                                sublistId: 'inventoryassignment',
                                                line: xx
                                            });

                                            var cmSrNo = invtSubRec.getCurrentSublistValue({
                                                sublistId: 'inventoryassignment',
                                                fieldId: 'receiptinventorynumber'
                                            });
                                            log.debug('cmSrNo 0 : ',cmSrNo);
                                            cmSrNo = "CM_"+cmSrNo;
                                            //cmSrNo = "CM_"+count+"_"+cmSrNo;
                                            //var cmSrNo = cmLineData[0]["srNo"];
                                            log.debug('cmSrNo 1 : ',cmSrNo);

                                            invtSubRec.setCurrentSublistValue({
                                                sublistId: 'inventoryassignment',
                                                fieldId: 'receiptinventorynumber',
                                                value: cmSrNo,
                                                ignoreFieldChange: false
                                            });

                                            invtSubRec.setCurrentSublistValue({
                                                sublistId: 'inventoryassignment',
                                                fieldId: 'quantity',
                                                value: 1,
                                                ignoreFieldChange: false
                                            });

                                            // Save the line in the subrecord's sublist.
                                            invtSubRec.commitLine({
                                                sublistId: 'inventoryassignment'
                                            });
                                            itemSerialNoArr.push({"itemId":itemId,"serialNo":cmSrNo});

                                        }
                                        itemQtyObj[itemId+'_S'] = itemSerialNoArr;
                                        log.debug('configure inventory detail');

                                    //}

                                }

                            }//End invItemInvtDtl condition
                            */

                            //commit sublist line item
                            cmRecord.commitLine({sublistId: 'item'});
                            cmFlag = true;
                        }else{
                            log.debug('remove line no :',p);
                            cmRecord.removeLine({sublistId: 'item',line: p,ignoreRecalc: true});
                        }

                    }//End for loop of line item

                  	//Get Item sublist Line count of credit memo
                    var newCMLineCount = cmRecord.getLineCount({sublistId: 'item'});
                    log.debug('newCMLineCount : ',newCMLineCount);

                  	if(newCMLineCount > 0){
                        var applyLineCount = cmRecord.getLineCount({sublistId: 'apply'});
                        log.debug('applyLineCount cm : ',applyLineCount);

                        // Get line number of credit memo where the invoice was applied
                        var lineWithCreditMemo = cmRecord.findSublistLineWithValue({
                            sublistId: 'apply',
                            fieldId: 'internalid',
                            value: parseInt(invId)
                        });
                        log.debug('lineWithCreditMemo : ',lineWithCreditMemo);

                        if(parseInt(lineWithCreditMemo) > -1){

                            //Select line
                            cmRecord.selectLine({
                                sublistId: 'apply',
                                line: parseInt(lineWithCreditMemo)
                            });

                            var dueAmt = cmRecord.getCurrentSublistValue({
                                sublistId: 'apply',
                                fieldId: 'due'
                            });
                            log.debug('dueAmt && btApplAmt in cm : ',dueAmt +' && '+btApplAmt);

                            //Set Line level Loop Return Item
                            cmRecord.setCurrentSublistValue({
                                sublistId: 'apply',
                                fieldId: 'apply',
                                value: true,
                                ignoreFieldChange: false
                            });

                            cmRecord.setCurrentSublistValue({
                                sublistId: 'apply',
                                fieldId: 'amount',
                                value: parseFloat(btApplAmt),
                                ignoreFieldChange: false
                            });

                            // Save the line in the item sublist.
                            cmRecord.commitLine({
                                sublistId: 'apply'
                            });
                        }//End apply condition
                        else{
                            cmFlag = false;
                            CreateStandAloneCreditMemo(patientId,soRecId,customData,cmLineItemArr,arItemObj);
                            /*var btFldId = record.submitFields({
                                type: 'customrecord_ch_bt_staging',
                                id: parseInt(btId),
                                values: {
                                    custrecord_ch_bt_exception: "No any applied invoice is available.",
                                    custrecord_ch_bt_processed: false,
                                    custrecord_ch_bt_dateprocessed: null
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields : true
                                }
                            });
                            */
                        }
                    }
					else{
                         CreateStandAloneCreditMemo(patientId,soRecId,customData,cmLineItemArr,arItemObj);
						/*var errBtFldId = record.submitFields({
							type: 'customrecord_ch_bt_staging',
							id: parseInt(btId),
							values: {
								custrecord_ch_bt_exception: "Applied Invoice item is not match with BrighTree item.",
								custrecord_ch_bt_processed: false,
								custrecord_ch_bt_dateprocessed: null
							},
							options: {
								enableSourcing: false,
								ignoreMandatoryFields : true
							}
						});
                        */
					}
                    log.debug('cmFlag :',cmFlag);

                }//End invId
				else{

					//Start Standalone Credit Memo
					//var itemObj		= customData.itemObj;
					var customer	= GetCustomerByPatientId(patientId);
					log.debug('customer in CM : ',customer);

					//Create credit memo record
					var cmRecord = record.create({
						type: record.Type.CREDIT_MEMO,
						isDynamic: true,
						defaultValues: {
							entity: customer
						}
					});

					log.debug('cmLineItemArr.length else : ',cmLineItemArr.length);

					for(var p=0; p < cmLineItemArr.length; p++){

						//Add new item sublist per line number
						cmRecord.selectNewLine({sublistId: 'item'});

						var itemQty = 1;
						var itemAmt = Math.abs(parseFloat(cmLineItemArr[p].itemAmt) || 0);
						//log.debug('itemAmt : ',itemAmt);

						var itemId  = cmLineItemArr[p].itemId;
						log.debug('itemId : ',itemId);

						if(itemId){

							cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'item',value: itemId,ignoreFieldChange: false});

							if(cmLineItemArr[p].itemQty==0){
								cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: itemQty,ignoreFieldChange: false});
								//itemAmt = parseFloat(invLineItemArr[p].itemRate)*parseInt(itemQty);
							}else{
								cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: cmLineItemArr[p].itemQty,ignoreFieldChange: false});
							}
							//cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: lineData[0].itemQty,ignoreFieldChange: false});
							cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'rate',value: cmLineItemArr[p].itemRate,ignoreFieldChange: false});
							cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'amount',value: itemAmt,ignoreFieldChange: false});
							cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'description',value: cmLineItemArr[p].itemDesc,ignoreFieldChange: false});
							cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_bt_internal_id',value: cmLineItemArr[p].btId,ignoreFieldChange: false});
							cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_bt_ext_id',value: cmLineItemArr[p].btExtId,ignoreFieldChange: false});
                          	cmRecord.setCurrentSublistText({sublistId: 'item',fieldId: 'cseg_ch_payer',text: cmLineItemArr[p].btPaymentType,ignoreFieldChange: false});
                            if(tranDate){
                                cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_bt_tran_date_col',value: tranDate,ignoreFieldChange: true});//
                            }
                            cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_tran_type_line',value: btTranType,ignoreFieldChange: true});//

							//commit sublist line item
							cmRecord.commitLine({sublistId: 'item'});
							cmFlag = true;

						}//End itemId condition

					}//End for loop
					log.debug('cmFlag in CM : ',cmFlag);

				}

				if(cmFlag==true){

					if(tranDate){
						cmRecord.setValue({fieldId:'trandate',value:tranDate});
                        cmRecord.setValue({fieldId:'custbody_ch_bt_transaction_date',value:tranDate});
					}
                    if(dateOfService){
						cmRecord.setValue({fieldId:'custbody_ch_date_of_service',value:dateOfService});
					}
                    if(btPaymentDate){
						cmRecord.setValue({fieldId:'custbody_cala_bt_payment_date',value:btPaymentDate});
					}
                    if(btInvCreatedDate){
						cmRecord.setValue({fieldId:'custbody_cala_bt_invoice_created_date',value:btInvCreatedDate});
					}
					cmRecord.setValue({fieldId:'custbody_ch_created_from',value:soRecId});
					cmRecord.setValue({fieldId:'custbody_ch_bt_tran_type',value:btTranType});
					cmRecord.setValue({fieldId:'custbody_ch_bt_tran_id',value:btTranNo});
                  	cmRecord.setValue({fieldId:'custbody_ch__bt_order_id',value:btOrderId});//
					cmRecord.setValue({fieldId:'custbody_ch_bt_app',value:btApplToFrom});
					cmRecord.setValue({fieldId:'custbody_ch_sfdc_bt_ext_id',value:btExtId});

					cmRecord.setValue({fieldId:'custbody_ch_pat_key',value:patientKey});
					cmRecord.setValue({fieldId:'custbody_ch_patient_id',value:patientId});
					cmRecord.setValue({fieldId:'custbody_ch_patient_name',value:patientName});
					cmRecord.setValue({fieldId:'custbody_ch_insurer_name',value:insuranceName});
					cmRecord.setValue({fieldId:'custbody_ch_payor_level',value:payorLevel});
					cmRecord.setValue({fieldId:'custbody_ch_pat_branch',value:patientBranch});
					cmRecord.setValue({fieldId:'custbody_ch_inv_city',value:btCity});
					cmRecord.setValue({fieldId:'custbody_ch_bt_inv_state',value:btState});
					cmRecord.setValue({fieldId:'custbody_ch_inv_zip',value:btZipCode});

                  	cmRecord.setValue({fieldId:'custbody_cl_ns_invoice_id',value:invId});
                    cmRecord.setText({fieldId:'cseg_ch_payer',text:btPaymentType});

					//save credit memo record
					var cmRecId = cmRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
					log.debug('Successfully Created Credit Memo record id is : ',cmRecId);
					var currDate = new Date();

					if(cmRecId > 0){

						for(var x=0; x < cmLineItemArr.length; x++){
							var fldId = record.submitFields({
								type: 'customrecord_ch_bt_staging',
								id: parseInt(cmLineItemArr[x].btId),
								values: {
									custrecord_ch_bt_associated_inv: cmRecId,
									custrecord_ch_bt_processed: true,
									custrecord_ch_bt_dateprocessed: currDate,
									custrecord_ch_bt_exception: ""
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields : true
								}
							});
						}//End for loop

						//flag = true;
						itemQtyObj["flag"] = true;
					}
				}

            }catch(ex){
				log.debug('Exception in Credit Memo is : ',ex.message);
                CreateStandAloneCreditMemo(patientId,soRecId,customData,cmLineItemArr,arItemObj);
				/*for(var e=0; e < cmLineItemArr.length; e++){
					var fldId = record.submitFields({
						type: 'customrecord_ch_bt_staging',
						id: parseInt(cmLineItemArr[e].btId),
						values: {
							custrecord_ch_bt_exception: ex.message
						},
						options: {
							enableSourcing: false,
							ignoreMandatoryFields : true
						}
					});
				}//End for loop	
                */
			}

          	//return flag;
          	return itemQtyObj;
		}

        function CreateStandAloneCreditMemo(patientId,soRecId,customData,cmLineItemArr,arItemObj){
			
			try{
				//Start Standalone Credit Memo
				log.debug('Start Stand Alone Credit Memo');

                log.debug('standalone cmLineItemArr : ',cmLineItemArr);
                var cmFlag = false, flag = false;
                var itemQtyObj  = new Object();

                //if(itemId!="4527" && itemId){
                if(cmLineItemArr[0].itemId!="4527" && cmLineItemArr[0].itemId){
					//Create standalone Credit memo
					for(var u=0; u < cmLineItemArr.length; u++){
						 var itemN = cmLineItemArr[u].itemName;
                          //log.debug('itemN && AR itemId : ',itemN +' && '+ arItemObj[itemN]);
						 cmLineItemArr[u].itemId = arItemObj[itemN];
					}
				}
				log.debug('updated stand alone cmLineItemArr : ',cmLineItemArr);

                var tranDate	= customData.tranDate;
              	var dateOfService	= customData.dateOfService;
                var btTranType	= customData.btTranType;
                var btTranNo	= customData.btTranNo;
              	var btOrderId	= customData.btOrderId;
                var patientKey	= customData.patientKey;
                var patientId	= customData.patientId;
                var patientName	= customData.patientName;
                var insuranceName= customData.insuranceName;
                var payorLevel	= customData.payorLevel;
                var patientBranch= customData.patientBranch;
                var btCity		= customData.btCity;
                var btState		= customData.btState;
                var btZipCode	= customData.btZipCode;
                var btApplToFrom= customData.btApplToFrom;
                var btApplAmt	= 0; //customData.btApplAmt;
                var btExtId		= cmLineItemArr[0].btExtId;
                var btId		= cmLineItemArr[0].btId;
                var btPaymentType= cmLineItemArr[0].btPaymentType;
                var btPaymentDate= customData.btPaymentDate;
                var btInvCreatedDate = customData.btInvCreatedDate;
              
				var customer	= GetCustomerByPatientId(patientId);
				log.debug('customer in stand alone CM : ',customer);

				//Create credit memo record
				var cmRecord = record.create({
					type: record.Type.CREDIT_MEMO,
					isDynamic: true,
					defaultValues: {
						entity: customer
					}
				});

				log.debug('stand alone cmLineItemArr.length : ',cmLineItemArr.length);

				for(var p=0; p < cmLineItemArr.length; p++){

					//Add new item sublist per line number
					cmRecord.selectNewLine({sublistId: 'item'});

					var itemQty = 1;
					var itemAmt = Math.abs(parseFloat(cmLineItemArr[p].itemAmt) || 0);
					//log.debug('itemAmt : ',itemAmt);

					var itemId  = cmLineItemArr[p].itemId;
					log.debug('itemId : ',itemId);

					if(itemId){

						cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'item',value: itemId,ignoreFieldChange: false});

						if(cmLineItemArr[p].itemQty==0){
							cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: itemQty,ignoreFieldChange: false});
							//itemAmt = parseFloat(invLineItemArr[p].itemRate)*parseInt(itemQty);
						}else{
							cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: cmLineItemArr[p].itemQty,ignoreFieldChange: false});
						}
						//cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: lineData[0].itemQty,ignoreFieldChange: false});
						cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'rate',value: cmLineItemArr[p].itemRate,ignoreFieldChange: false});
						cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'amount',value: itemAmt,ignoreFieldChange: false});
						cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'description',value: cmLineItemArr[p].itemDesc,ignoreFieldChange: false});
						cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_bt_internal_id',value: cmLineItemArr[p].btId,ignoreFieldChange: false});
						cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_bt_ext_id',value: cmLineItemArr[p].btExtId,ignoreFieldChange: false});
						cmRecord.setCurrentSublistText({sublistId: 'item',fieldId: 'cseg_ch_payer',text: cmLineItemArr[p].btPaymentType,ignoreFieldChange: false});
                        if(tranDate){
                            cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_bt_tran_date_col',value: tranDate,ignoreFieldChange: true});//
                        }
                        cmRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_tran_type_line',value: btTranType,ignoreFieldChange: true});//

						//commit sublist line item
						cmRecord.commitLine({sublistId: 'item'});
						cmFlag = true;

					}//End itemId condition

				}//End for loop
				log.debug('cmFlag in CM : ',cmFlag);
				
				if(cmFlag==true){

					if(tranDate){
						cmRecord.setValue({fieldId:'trandate',value:tranDate});
                        cmRecord.setValue({fieldId:'custbody_ch_bt_transaction_date',value:tranDate});
					}
					if(dateOfService){
						cmRecord.setValue({fieldId:'custbody_ch_date_of_service',value:dateOfService});
					}
					if(btPaymentDate){
						cmRecord.setValue({fieldId:'custbody_cala_bt_payment_date',value:btPaymentDate});
					}
					if(btInvCreatedDate){
						cmRecord.setValue({fieldId:'custbody_cala_bt_invoice_created_date',value:btInvCreatedDate});
					}
					cmRecord.setValue({fieldId:'custbody_ch_created_from',value:soRecId});
					cmRecord.setValue({fieldId:'custbody_ch_bt_tran_type',value:btTranType});
					cmRecord.setValue({fieldId:'custbody_ch_bt_tran_id',value:btTranNo});
					cmRecord.setValue({fieldId:'custbody_ch__bt_order_id',value:btOrderId});//
					cmRecord.setValue({fieldId:'custbody_ch_bt_app',value:btApplToFrom});
					cmRecord.setValue({fieldId:'custbody_ch_sfdc_bt_ext_id',value:btExtId});

					cmRecord.setValue({fieldId:'custbody_ch_pat_key',value:patientKey});
					cmRecord.setValue({fieldId:'custbody_ch_patient_id',value:patientId});
					cmRecord.setValue({fieldId:'custbody_ch_patient_name',value:patientName});
					cmRecord.setValue({fieldId:'custbody_ch_insurer_name',value:insuranceName});
					cmRecord.setValue({fieldId:'custbody_ch_payor_level',value:payorLevel});
					cmRecord.setValue({fieldId:'custbody_ch_pat_branch',value:patientBranch});
					cmRecord.setValue({fieldId:'custbody_ch_inv_city',value:btCity});
					cmRecord.setValue({fieldId:'custbody_ch_bt_inv_state',value:btState});
					cmRecord.setValue({fieldId:'custbody_ch_inv_zip',value:btZipCode});

                    cmRecord.setText({fieldId:'cseg_ch_payer',text:btPaymentType});

					//cmRecord.setValue({fieldId:'custbody_cl_ns_invoice_id',value:invId});

					//save credit memo record
					var cmRecId = cmRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
					log.debug('Successfully Created Credit Memo record id is : ',cmRecId);
					var currDate = new Date();

					if(cmRecId > 0){

						for(var x=0; x < cmLineItemArr.length; x++){
							var fldId = record.submitFields({
								type: 'customrecord_ch_bt_staging',
								id: parseInt(cmLineItemArr[x].btId),
								values: {
									custrecord_ch_bt_associated_inv: cmRecId,
									custrecord_ch_bt_processed: true,
									custrecord_ch_bt_dateprocessed: currDate,
									custrecord_ch_bt_exception: ""
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields : true
								}
							});
						}//End for loop

						//flag = true;
						//itemQtyObj["flag"] = true;
					}
				}
				
			}
			catch(ex){
				log.debug('Exception in Stand alone Credit Memo is : ',ex.message);
				for(var e=0; e < cmLineItemArr.length; e++){
					var fldId = record.submitFields({
						type: 'customrecord_ch_bt_staging',
						id: parseInt(cmLineItemArr[e].btId),
						values: {
							custrecord_ch_bt_exception: ex.message
						},
						options: {
							enableSourcing: false,
							ignoreMandatoryFields : true
						}
					});
				}//End for loop	
			}
		}

		function CreateInvoiceRecord(soRecId,customData,lineItemArr,arItemObj){

          	try{

                log.debug('Start Invoice');
                log.debug('lineItemArr : ',lineItemArr);
                var invFlag = false, invItemIdArr = [];

                var tranDate	= customData.tranDate;
              	var dateOfService	= customData.dateOfService;
                var btTranType	= customData.btTranType;
                var btTranNo	= customData.btTranNo;
              	var btOrderId	= customData.btOrderId;//
                var patientKey	= customData.patientKey;
                var patientId	= customData.patientId;
                var patientName	= customData.patientName;
                var insuranceName= customData.insuranceName;
                var payorLevel	= customData.payorLevel;
                var patientBranch= customData.patientBranch;
                var btCity		= customData.btCity;
                var btState		= customData.btState;
                var btZipCode	= customData.btZipCode;
                var btPaymentDate= customData.btPaymentDate;
                var btInvCreatedDate = customData.btInvCreatedDate;
                var btPaymentType= lineItemArr[0].btPaymentType;

                //Transform sales order to an invoice record
                var invRecord = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    fromId: parseInt(soRecId),
                    toType: record.Type.INVOICE,
                    isDynamic: true
                });

              	//lookup for SO Amount field
                var fieldLookUp = 	search.lookupFields({
                                        type: search.Type.SALES_ORDER,
                                        id: parseInt(soRecId),
                                        columns: ['total']
                                    });
                var soAmt		=	fieldLookUp.total;
                log.debug('soAmt : ',soAmt);

                //Get Item sublist Line count of an invoice
                var invLineCount = invRecord.getLineCount({sublistId: 'item'});
                log.debug('invLineCount : ',invLineCount);

                //Loop through all lines to set received item of an invoice
                for(var p=invLineCount-1; p > -1; p--){

                    //Select item sublist per line number
                    invRecord.selectLine({sublistId: 'item',line: p});

                    var line 		= parseInt(invRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'line'}));
                    //log.debug('line : ',line);
                    var itemId 		= invRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'item'});
                    //log.debug('itemId Inv : ',itemId);
                    var itemQty 	= invRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'quantity'});
                    //log.debug('itemQty Inv : ',itemQty);
                    var lineData  = lineItemArr.filter(function (entry) { return entry.itemId === itemId; });
                    //log.debug('lineData Inv : ',lineData);
                  	var nextLineData  = lineItemArr.filter(function (entry) { return entry.nextItemId === itemId; });
                    //log.debug('nextLineData Inv : ',nextLineData);

                    if(lineData.length > 0 || nextLineData.length > 0){

                        //var itemAmt = parseFloat(lineData[0].itemRate)*parseInt(lineData[0].itemQty);
                        var itemAmt = parseFloat(lineData[0].itemAmt);
                        //log.debug('itemAmt : ',itemAmt);

                        if(lineData[0].itemQty==0){
                            invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: itemQty,ignoreFieldChange: false});
                            itemAmt = parseFloat(lineData[0].itemRate)*parseInt(itemQty);
                        }else if(lineData[0].arFlag==true){
							var arLineQty = parseFloat(itemAmt)/parseFloat(soAmt);
                          	arLineQty = parseFloat(arLineQty).toFixed(2);
                          	log.debug('arLineQty in invoice : ',arLineQty);
                            invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: arLineQty,ignoreFieldChange: false});
                        }else{
                            invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: lineData[0].itemQty,ignoreFieldChange: false});
                        }
                        //invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: lineData[0].itemQty,ignoreFieldChange: false});
                        invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'rate',value: lineData[0].itemRate,ignoreFieldChange: false});
                        invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'amount',value: itemAmt,ignoreFieldChange: true});
                        invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'description',value: lineData[0].itemDesc,ignoreFieldChange: true});
                        invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_bt_internal_id',value: lineData[0].btId,ignoreFieldChange: true});
                        invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_bt_ext_id',value: lineData[0].btExtId,ignoreFieldChange: true});

                      	invRecord.setCurrentSublistText({sublistId: 'item',fieldId: 'cseg_ch_payer',text: lineData[0].btPaymentType,ignoreFieldChange: true});
                        if(tranDate){
                            invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_bt_tran_date_col',value: tranDate,ignoreFieldChange: true});//
                        }
                        invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_tran_type_line',value: btTranType,ignoreFieldChange: true});//

                        //commit sublist line item
                        invRecord.commitLine({sublistId: 'item'});
                        invFlag = true;
                        invItemIdArr.push(itemId);
                    }else{
                        log.debug('remove line no :',p);
                        invRecord.removeLine({sublistId: 'item',line: p,ignoreRecalc: false});
                    }

                }//End for loop of line item
                log.debug('invFlag : ',invFlag);
              	var newInvLineCount = invRecord.getLineCount({sublistId: 'item'});
                log.debug('newInvLineCount : ',newInvLineCount);

                if(invFlag==true){
                  	var itemN = invRecord.getSublistText({sublistId: 'item',fieldId: 'item',line:0});
                  	var itemAmt1 = invRecord.getSublistValue({sublistId: 'item',fieldId: 'amount',line:0});
                  	var itemQty1 = invRecord.getSublistValue({sublistId: 'item',fieldId: 'quantity',line:0});
                  	var invTotal1= invRecord.getValue({fieldId:'total'});
                  	log.debug('itemN & itemAmt1 & invTotal1 & itemQty1 : ',itemN+' & '+itemAmt1+' & '+invTotal1+' & '+itemQty1);

                    if(btInvCreatedDate){
                        invRecord.setValue({fieldId:'trandate',value:btInvCreatedDate});
                    }
                    else if(tranDate){
                        invRecord.setValue({fieldId:'trandate',value:tranDate});
                        invRecord.setValue({fieldId:'custbody_ch_bt_transaction_date',value:tranDate});
                    }
                  	if(dateOfService){
						invRecord.setValue({fieldId:'custbody_ch_date_of_service',value:dateOfService});
					}
                    if(btPaymentDate){
						invRecord.setValue({fieldId:'custbody_cala_bt_payment_date',value:btPaymentDate});
					}
                    if(btInvCreatedDate){
						invRecord.setValue({fieldId:'custbody_cala_bt_invoice_created_date',value:btInvCreatedDate});
					}
                    invRecord.setValue({fieldId:'custbody_ch_created_from',value:soRecId});
                    invRecord.setValue({fieldId:'custbody_ch_bt_tran_id_invoice',value:btTranNo});
                    invRecord.setValue({fieldId:'custbody_ch_bt_tran_id',value:btTranNo});
                  	invRecord.setValue({fieldId:'custbody_ch__bt_order_id',value:btOrderId});//
                    invRecord.setValue({fieldId:'custbody_ch_bt_tran_type',value:btTranType});

                    invRecord.setValue({fieldId:'custbody_ch_pat_key',value:patientKey});
                    invRecord.setValue({fieldId:'custbody_ch_patient_id',value:patientId});
                    invRecord.setValue({fieldId:'custbody_ch_patient_name',value:patientName});
                    invRecord.setValue({fieldId:'custbody_ch_insurer_name',value:insuranceName});
                    invRecord.setValue({fieldId:'custbody_ch_payor_level',value:payorLevel});
                    invRecord.setValue({fieldId:'custbody_ch_pat_branch',value:patientBranch});
                    invRecord.setValue({fieldId:'custbody_ch_inv_city',value:btCity});
                    invRecord.setValue({fieldId:'custbody_ch_bt_inv_state',value:btState});
                    invRecord.setValue({fieldId:'custbody_ch_inv_zip',value:btZipCode});

                    invRecord.setText({fieldId:'cseg_ch_payer',text:btPaymentType});

                    //save invoice record
                    var invRecId = invRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
                    log.debug('Created Invoice record id is : ',invRecId);
                    var currDate = new Date();

                    for(var x=0; x < lineItemArr.length; x++){
                        log.debug('invItemIdArr : ',invItemIdArr);
						log.debug('lineItemArr[x].itemId : '+x,lineItemArr[x].itemId);
						if(invItemIdArr.indexOf(lineItemArr[x].itemId)!=-1){
							var fldId = record.submitFields({
								type: 'customrecord_ch_bt_staging',
								id: parseInt(lineItemArr[x].btId),
								values: {
									custrecord_ch_bt_associated_inv: invRecId,
									custrecord_ch_bt_processed: true,
									custrecord_ch_bt_dateprocessed: currDate,
									custrecord_ch_bt_exception: ""
								},
								options: {
									enableSourcing: false,
									ignoreMandatoryFields : true
								}
							});
						}
                    }//End for loop
                }else{
                    //Create standalone invoice
                    for(var u=0; u<lineItemArr.length; u++){
                         var itemN = lineItemArr[u].itemName;
                         lineItemArr[u].itemId = arItemObj[itemN];
                    }
                    log.debug('updated lineItemArr : ',lineItemArr);
                    CreateStandAloneInvoiceRecord(soRecId,customData,lineItemArr);
                  
                  	/*for(var x=0; x < lineItemArr.length; x++){
                        var fldId = record.submitFields({
                            type: 'customrecord_ch_bt_staging',
                            id: parseInt(lineItemArr[x].btId),
                            values: {
                                custrecord_ch_bt_exception: "BrighTree item does not match with transform invoice from sales order."
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields : true
                            }
                        });
                    }//End for loop
                    */
                }

            }catch(ex){
              	log.debug('Exception in an Invoice creation : ',ex.message);
              	for(var e=0; e < lineItemArr.length; e++){
                    var fldId = record.submitFields({
						type: 'customrecord_ch_bt_staging',
						id: parseInt(lineItemArr[e].btId),
						values: {
						  custrecord_ch_bt_exception: ex.message
						},
						options: {
						  enableSourcing: false,
						  ignoreMandatoryFields : true
						}
					});
                }//End for loop
            }
		}

		function CreateStandAloneInvoiceRecord(soRecId,customData,invLineItemArr){

          	var invRecId = 0;
			try{

                log.debug('Start Stand Alone Invoice');
                log.debug('invLineItemArr : ',invLineItemArr);
                var invFlag = false;

                var tranDate	= customData.tranDate;
              	var dateOfService	= customData.dateOfService;
                var btTranType	= customData.btTranType;
                var btTranNo	= customData.btTranNo;
              	var btOrderId	= customData.btOrderId;//
                var patientKey	= customData.patientKey;
                var patientId	= customData.patientId;
                var patientName	= customData.patientName;
                var insuranceName= customData.insuranceName;
                var payorLevel	= customData.payorLevel;
                var patientBranch= customData.patientBranch;
                var btCity		= customData.btCity;
                var btState		= customData.btState;
                var btZipCode	= customData.btZipCode;
                var btPaymentDate= customData.btPaymentDate;
                var btInvCreatedDate = customData.btInvCreatedDate;
                var btPaymentType= invLineItemArr[0].btPaymentType;

              	//var itemObj		= customData.itemObj;

				var customer	= GetCustomerByPatientId(patientId);
				log.debug('customer : ',customer);

                //Create invoice record
				var invRecord = record.create({
                    type: record.Type.INVOICE,
                    isDynamic: true,
					defaultValues: {
						entity: customer
					}
                });

				log.debug('invLineItemArr.length : ',invLineItemArr.length);

				for(var p=0; p < invLineItemArr.length; p++){

					//Add new item sublist per line number
					invRecord.selectNewLine({sublistId: 'item'});

					var itemQty = 1;
                  	var itemAmt = parseFloat(invLineItemArr[p].itemAmt) || 0;
                  	//if(itemAmt==0){
						//itemAmt = parseFloat(invLineItemArr[p].itemRate)*parseInt(invLineItemArr[p].itemQty);
                    //}
					//log.debug('itemAmt : ',itemAmt);

                  	log.debug('invLineItemArr[p].itemName : ',invLineItemArr[p].itemName);
                  	var itemId  = invLineItemArr[p].itemId; //itemObj[invLineItemArr[p].itemName];
					log.debug('itemId : ',itemId);

                  	invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'item',value: itemId,ignoreFieldChange: false});

					if(invLineItemArr[p].itemQty==0){
						invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: itemQty,ignoreFieldChange: false});
						//itemAmt = parseFloat(invLineItemArr[p].itemRate)*parseInt(itemQty);
					}else{
						invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: invLineItemArr[p].itemQty,ignoreFieldChange: false});
					}
					//invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: lineData[0].itemQty,ignoreFieldChange: false});
					invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'rate',value: invLineItemArr[p].itemRate,ignoreFieldChange: false});
					invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'amount',value: Math.abs(itemAmt),ignoreFieldChange: true});
					invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'description',value: invLineItemArr[p].itemDesc,ignoreFieldChange: true});
					invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_bt_internal_id',value: invLineItemArr[p].btId,ignoreFieldChange: true});
					invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_bt_ext_id',value: invLineItemArr[p].btExtId,ignoreFieldChange: true});

                  	invRecord.setCurrentSublistText({sublistId: 'item',fieldId: 'cseg_ch_payer',text: invLineItemArr[p].btPaymentType,ignoreFieldChange: true});
                    if(tranDate){
                        invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_bt_tran_date_col',value: tranDate,ignoreFieldChange: true});//
                    }
                    invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_tran_type_line',value: btTranType,ignoreFieldChange: true});//
                  
					//commit sublist line item
					invRecord.commitLine({sublistId: 'item'});
					invFlag = true;

				}//End for loop
				log.debug('invFlag : ',invFlag);

				if(invFlag==true){

                    if(btInvCreatedDate){
                        invRecord.setValue({fieldId:'trandate',value:btInvCreatedDate});
                    }
                    else if(tranDate){
                        invRecord.setValue({fieldId:'trandate',value:tranDate});
                        invRecord.setValue({fieldId:'custbody_ch_bt_transaction_date',value:tranDate});
                    }
                  	if(dateOfService){
						invRecord.setValue({fieldId:'custbody_ch_date_of_service',value:dateOfService});
					}
                    if(btPaymentDate){
						invRecord.setValue({fieldId:'custbody_cala_bt_payment_date',value:btPaymentDate});
					}
                    if(btInvCreatedDate){
						invRecord.setValue({fieldId:'custbody_cala_bt_invoice_created_date',value:btInvCreatedDate});
					}
                    invRecord.setValue({fieldId:'custbody_ch_created_from',value:soRecId});
                    invRecord.setValue({fieldId:'custbody_ch_bt_tran_id_invoice',value:btTranNo});
                    invRecord.setValue({fieldId:'custbody_ch_bt_tran_id',value:btTranNo});
                  	invRecord.setValue({fieldId:'custbody_ch__bt_order_id',value:btOrderId});
                    invRecord.setValue({fieldId:'custbody_ch_bt_tran_type',value:btTranType});

                    invRecord.setValue({fieldId:'custbody_ch_pat_key',value:patientKey});
                    invRecord.setValue({fieldId:'custbody_ch_patient_id',value:patientId});
                    invRecord.setValue({fieldId:'custbody_ch_patient_name',value:patientName});
                    invRecord.setValue({fieldId:'custbody_ch_insurer_name',value:insuranceName});
                    invRecord.setValue({fieldId:'custbody_ch_payor_level',value:payorLevel});
                    invRecord.setValue({fieldId:'custbody_ch_pat_branch',value:patientBranch});
                    invRecord.setValue({fieldId:'custbody_ch_inv_city',value:btCity});
                    invRecord.setValue({fieldId:'custbody_ch_bt_inv_state',value:btState});
                    invRecord.setValue({fieldId:'custbody_ch_inv_zip',value:btZipCode});

                    invRecord.setText({fieldId:'cseg_ch_payer',text:btPaymentType});

                    //save invoice record
                    invRecId = invRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
                    log.debug('Created Invoice record id is : ',invRecId);
                    var currDate = new Date();

                    for(var x=0; x < invLineItemArr.length; x++){
                        var fldId = record.submitFields({
                            type: 'customrecord_ch_bt_staging',
                            id: parseInt(invLineItemArr[x].btId),
                            values: {
                                custrecord_ch_bt_associated_inv: invRecId,
                                custrecord_ch_bt_processed: true,
                                custrecord_ch_bt_dateprocessed: currDate,
                                custrecord_ch_bt_exception: ""
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields : true
                            }
                        });
                    }//End for loop
                }

            }catch(ex){
              	log.debug('Exception in an Invoice creation : ',ex.message);
              	for(var e=0; e < invLineItemArr.length; e++){
                    var fldId = record.submitFields({
						type: 'customrecord_ch_bt_staging',
						id: parseInt(invLineItemArr[e].btId),
						values: {
						  custrecord_ch_bt_exception: ex.message
						},
						options: {
						  enableSourcing: false,
						  ignoreMandatoryFields : true
						}
					});
                }//End for loop
            }
          	return invRecId;
		}

   		function CreateBLInvoiceRecord(soRecId,customData,lineItemArr){

          	try{

                log.debug('Start Invoice for BL');
                log.debug('lineItemArr : ',lineItemArr);
                var invFlag = false;

                var tranDate	= customData.tranDate;
              	var dateOfService	= customData.dateOfService;
                var btTranType	= customData.btTranType;
                var btTranNo	= customData.btTranNo;
              	var btOrderId	= customData.btOrderId;//
                var patientKey	= customData.patientKey;
                var patientId	= customData.patientId;
                var patientName	= customData.patientName;
                var insuranceName= customData.insuranceName;
                var payorLevel	= customData.payorLevel;
                var patientBranch= customData.patientBranch;
                var btCity		= customData.btCity;
                var btState		= customData.btState;
                var btZipCode	= customData.btZipCode;
                var btPaymentDate= customData.btPaymentDate;
                var btInvCreatedDate = customData.btInvCreatedDate;
                var btPaymentType= lineItemArr[0].btPaymentType;

                //lookup for customer field
                /*var fieldLookUp 	= 	search.lookupFields({
                                            type: search.Type.SALES_ORDER,
                                            id: parseInt(soRecId),
                                            columns: ['entity','location']
                                        });
                var customer		=	fieldLookUp.entity[0].value;
                log.debug('customer for BL : ',customer);
                var invLoc			=	fieldLookUp.location[0].value;
                log.debug('invLoc for BL : ',invLoc);
                */

              	var customer		= GetCustomerByPatientId(patientId);
				log.debug('customer : ',customer);
				var invLoc			= '8';

                var invRecord = record.create({
                    type: record.Type.INVOICE,
                    defaultValues: {
                        entity: customer
                    },
                    isDynamic: true
                });

                invRecord.setValue({fieldId:'location',value:invLoc,ignoreFieldChange: false});

                //Get Item sublist Line count of an invoice
                var invLineCount= invRecord.getLineCount({sublistId: 'item'});
                log.debug('invLineCount in BL : ',invLineCount);

                for(var x=0; x < lineItemArr.length; x++){

                    var itemId 		= lineItemArr[x].itemId;
                    var itemQty 	= lineItemArr[x].itemQty || 1; //itemQtyObj[itemId];
                    //var itemSrNoArr	= itemQtyObj[itemId+'_S'];
                    //log.debug('itemSrNoArr :',itemSrNoArr);
                    var itemRate 	= lineItemArr[x].itemRate;
                    var itemDesc 	= lineItemArr[x].itemDesc;
                    var itemAmt		= Math.abs(lineItemArr[x].itemAmt); //parseFloat(itemRate)*parseInt(itemQty);
                    var btId		= lineItemArr[x].btId;
                    var btExtId		= lineItemArr[x].btExtId;

                    //Select New Line
                    invRecord.selectNewLine({
                        sublistId: 'item'
                    });

                    //Set Line level discount item
                    invRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: itemId,
                        ignoreFieldChange: false
                    });

                    invRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: itemQty
                    });

                    invRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        value: itemDesc
                    });

                    invRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: itemRate
                    });

                    invRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ch_sfdc_bt_internal_id',
                        value: btId
                    });

                    invRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ch_sfdc_bt_ext_id',
                        value: btExtId
                    });

                    invRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        value: itemAmt
                    });

                  	invRecord.setCurrentSublistText({
						sublistId: 'item',
						fieldId: 'cseg_ch_payer',
						text: lineItemArr[x].btPaymentType,
						ignoreFieldChange: true
					});

                    if(tranDate){
                        invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_bt_tran_date_col',value: tranDate,ignoreFieldChange: true});//
                    }
                    invRecord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_ch_tran_type_line',value: btTranType,ignoreFieldChange: true});//

                    //Configure Inventory Detail
                    var isInvtDetail= invRecord.getCurrentSublistValue({sublistId: 'item',fieldId: 'inventorydetailavail'});
                    log.debug('isInvtDetail on Invoice : ',isInvtDetail);

                    if(isInvtDetail=='T'){

                        // Get the subrecord for that line.
                        var invSubRec = invRecord.getCurrentSublistSubrecord({
                            sublistId: 'item',
                            fieldId: 'inventorydetail'
                        });

                        var serial_numbers = invSubRec.getSublistField({
                            sublistId: 'inventoryassignment',
                            fieldId: 'issueinventorynumber',
                            line: 0
                        }).getSelectOptions();
                        log.debug('serial_numbers : ',serial_numbers);

                        for(var y=0; y < itemSrNoArr.length; y++){

                            var invSrNo = itemSrNoArr[y].serialNo;
                            log.debug('invSrNo : '+y,invSrNo);

                            if(serial_numbers.length > 0){

                                var serialData 	= serial_numbers.filter(function (entry) { return entry.text === String(invSrNo); });
                                if(serialData.length > 0){

                                    var inventIntId = serialData[0].value;
                                    log.debug('inventIntId : ',inventIntId);

                                    invSubRec.selectNewLine({
                                        sublistId: 'inventoryassignment'
                                    });

                                    invSubRec.setCurrentSublistValue({
                                        sublistId: 'inventoryassignment',
                                        fieldId: 'issueinventorynumber',
                                        value: inventIntId,
                                        ignoreFieldChange: false
                                    });

                                    invSubRec.setCurrentSublistValue({
                                        sublistId: 'inventoryassignment',
                                        fieldId: 'quantity',
                                        value: 1,
                                        ignoreFieldChange: false
                                    });

                                    // Save the line in the subrecord's sublist.
                                    invSubRec.commitLine({
                                        sublistId: 'inventoryassignment'
                                    });

                                }//End serialData

                            }//End serial_numbers

                        }//End for loop

                    }//End Inventory Detail condition

                    // Save the line in the item sublist.
                    invRecord.commitLine({
                        sublistId: 'item'
                    });

                    flag = true;

                }//End line item for loop
                log.debug('stand alone inv flag : ',flag);

                if(flag==true){

                    log.debug('btInvCreatedDate & tranDate & dateOfService & btPaymentDate : ',btInvCreatedDate +' & '+tranDate +' & '+dateOfService +' & '+btPaymentDate);
                    if(btInvCreatedDate){
                        invRecord.setValue({fieldId:'trandate',value:btInvCreatedDate});
                    }
                    else if(tranDate){
                        invRecord.setValue({fieldId:'trandate',value:tranDate});
                        invRecord.setValue({fieldId:'custbody_ch_bt_transaction_date',value:tranDate});
                    }
                  	if(dateOfService){
                        invRecord.setValue({fieldId:'custbody_ch_date_of_service',value:dateOfService});
					}
                    if(btPaymentDate){
                        invRecord.setValue({fieldId:'custbody_cala_bt_payment_date',value:btPaymentDate});
					}
                    if(btInvCreatedDate){
                        invRecord.setValue({fieldId:'custbody_cala_bt_invoice_created_date',value:btInvCreatedDate});
					}
                    
                    invRecord.setValue({fieldId:'custbody_ch_created_from',value:soRecId});
                    invRecord.setValue({fieldId:'custbody_ch_bt_tran_id_invoice',value:btTranNo});
                    invRecord.setValue({fieldId:'custbody_ch_bt_tran_id',value:btTranNo});
                  	invRecord.setValue({fieldId:'custbody_ch__bt_order_id',value:btOrderId});//
                    invRecord.setValue({fieldId:'custbody_ch_bt_tran_type',value:btTranType});

                    invRecord.setValue({fieldId:'custbody_ch_pat_key',value:patientKey});
                    invRecord.setValue({fieldId:'custbody_ch_patient_id',value:patientId});
                    invRecord.setValue({fieldId:'custbody_ch_patient_name',value:patientName});
                    invRecord.setValue({fieldId:'custbody_ch_insurer_name',value:insuranceName});
                    invRecord.setValue({fieldId:'custbody_ch_payor_level',value:payorLevel});

                    invRecord.setValue({fieldId:'custbody_ch_pat_branch',value:patientBranch});
                    invRecord.setValue({fieldId:'custbody_ch_inv_city',value:btCity});
                    invRecord.setValue({fieldId:'custbody_ch_bt_inv_state',value:btState});
                    invRecord.setValue({fieldId:'custbody_ch_inv_zip',value:btZipCode});

                    invRecord.setText({fieldId:'cseg_ch_payer',text:btPaymentType});

                    //Save Invoice record
                    var invRecId = invRecord.save({enableSourcing: true, ignoreMandatoryFields: true});
                    if(invRecId > 0){
                        log.debug("Successfully saved invoice record id is : ",invRecId);
                      	var currDate = new Date();
                        for(var z=0; z < lineItemArr.length; z++){
                            var fldId = record.submitFields({
                                type: 'customrecord_ch_bt_staging',
                                id: parseInt(lineItemArr[z].btId),
                                values: {
                                    custrecord_ch_bt_bal_trf_inv: invRecId,
                                  	custrecord_ch_bt_associated_inv: invRecId,
                                  	custrecord_ch_bt_processed: true,
									custrecord_ch_bt_dateprocessed: currDate,
									custrecord_ch_bt_exception: ""
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields : true
                                }
                            });

                        }//End for loop
                    }
                }
            }catch(ex){
				log.debug('Exception in BL Invoice creation is : ',ex.message);
				for(var e=0; e < lineItemArr.length; e++){
					var fldId = record.submitFields({
						type: 'customrecord_ch_bt_staging',
						id: parseInt(lineItemArr[e].btId),
						values: {
							custrecord_ch_bt_exception: ex.message
						},
						options: {
							enableSourcing: false,
							ignoreMandatoryFields : true
						}
					});
				}
			}
        }

   		function CreateCustomerPayment(soRecId,customData,paymentDataArr){

          	try{

                log.debug('Start Customer Payment');

                var matchInvFlag= false, btInvFilterArr = [], invIdArr = [];
                var subBTInvFilterArr = [];

                btInvFilterArr.push(["type","anyof","CustInvc"]);
                btInvFilterArr.push("AND");
                btInvFilterArr.push(["mainline","is","T"]);
                btInvFilterArr.push("AND");

                var tranDate	= customData.tranDate;
              	var dateOfService	= customData.dateOfService;
                var btTranType	= customData.btTranType;
                var btTranNo	= customData.btTranNo;
                var patientKey	= customData.patientKey;
                var patientId	= customData.patientId;
                var patientName	= customData.patientName;
                var insuranceName= customData.insuranceName;
                var payorLevel	= customData.payorLevel;
                var patientBranch= customData.patientBranch;
                var btCity		= customData.btCity;
                var btState		= customData.btState;
                var btZipCode	= customData.btZipCode;
                var btApplToFrom= customData.btApplToFrom;
                var btApplAmt	= customData.btApplAmt;
                var btExtId		= paymentDataArr[0].btExtId;
                var btId        = paymentDataArr[0].btId;
                var btPaymentDate= customData.btPaymentDate;

                /*var fieldLookUp 	= 	search.lookupFields({
                                            type: search.Type.SALES_ORDER,
                                            id: parseInt(soRecId),
                                            columns: ['entity']
                                        });
                var customer		=	fieldLookUp.entity[0].value;
                log.debug('customer : ',customer);
                */

              	var customer		= GetCustomerByPatientId(patientId);
				log.debug('customer : ',customer);

                for(var x=0; x < paymentDataArr.length; x++){

                    var btInvTranNo = String(paymentDataArr[x].btAppliedToFrom);
                    log.debug('btInvTranNo : ',btInvTranNo);
                    var myFilter 	= ["custbody_ch_bt_tran_id_invoice","is",btInvTranNo];
                    subBTInvFilterArr.push(myFilter);
                    subBTInvFilterArr.push("OR");

                    if(x==paymentDataArr.length-1){

                        subBTInvFilterArr.pop("OR");
                        btInvFilterArr.push(subBTInvFilterArr);

                        invIdArr	= GetInvoiceIds(btInvFilterArr);
                    }

                }//End for loop

                log.debug('invIdArr for CP : ',invIdArr);

                //Create Customer Payment
                var customerPaymentObj = record.create({
                    type: record.Type.CUSTOMER_PAYMENT,
                    isDynamic: true,
                    defaultValues: {
                        entity: customer
                    }
                });

                var lineCount = customerPaymentObj.getLineCount({sublistId: 'apply'});
                log.debug('lineCount cp : ',lineCount);

                customerPaymentObj.setValue({fieldId:'payment',value:parseFloat(btApplAmt)});

                //for(var y=0; y < invIdArr.length; y++){

                    /* Get line number of customer payment where the invoice was applied */
                    var lineWithPayment = customerPaymentObj.findSublistLineWithValue({
                        sublistId: 'apply',
                        fieldId: 'internalid',
                        value: parseInt(invIdArr[0])
                    });

                    if(parseInt(lineWithPayment) > -1){

                        //Select line
                        customerPaymentObj.selectLine({
                            sublistId: 'apply',
                            line: parseInt(lineWithPayment)
                        });

                        var dueAmt = customerPaymentObj.getCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'due'
                        });
                        log.debug('dueAmt && btApplAmt : ',dueAmt +' && '+btApplAmt);

                        //Set Line level Loop Return Item
                        customerPaymentObj.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            value: true
                        });

                        customerPaymentObj.setCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'amount',
                            value: parseFloat(btApplAmt)
                        });

                        // Save the line in the item sublist.
                        customerPaymentObj.commitLine({
                            sublistId: 'apply'
                        });

                        var applyAmt = customerPaymentObj.getCurrentSublistValue({
                            sublistId: 'apply',
                            fieldId: 'amount'
                        });
                        log.debug('applyAmt : ',applyAmt);

                        matchInvFlag = true;
                    }

                //}//End inv for loop

                log.debug('matchInvFlag : ',matchInvFlag);

                if(matchInvFlag==true){

                    if(btPaymentDate){
                        customerPaymentObj.setValue({fieldId:'trandate',value:btPaymentDate});
                    }else if(tranDate){
                        customerPaymentObj.setValue({fieldId:'trandate',value:tranDate});
                        customerPaymentObj.setValue({fieldId:'custbody_ch_bt_transaction_date',value:tranDate});
                    }
                  	if(dateOfService){
						customerPaymentObj.setValue({fieldId:'custbody_ch_date_of_service',value:dateOfService});
					}
                    if(btPaymentDate){
						customerPaymentObj.setValue({fieldId:'custbody_cala_bt_payment_date',value:btPaymentDate});
					}
                    customerPaymentObj.setValue({fieldId:'custbody_ch_created_from',value:soRecId});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_bt_tran_type',value:btTranType});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_bt_payment_tran_number',value:btTranNo});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_bt_tran_id',value:btTranNo});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_sfdc_bt_ext_id',value:btExtId});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_pat_key',value:patientKey});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_patient_id',value:patientId});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_patient_name',value:patientName});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_insurer_name',value:insuranceName});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_payor_level',value:payorLevel});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_pat_branch',value:patientBranch});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_inv_city',value:btCity});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_bt_inv_state',value:btState});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_inv_zip',value:btZipCode});
                    customerPaymentObj.setValue({fieldId:'custbody_ch_bt_app',value:btApplToFrom});

                    customerPaymentObj.setValue({fieldId:'custbody_sfdc_bt_internal_id',value:btId});

                    var cpRecId = customerPaymentObj.save({enableSourcing: false, ignoreMandatoryFields: true});
                    log.debug('Successfully created Customer Payment record : ',cpRecId);
                    var currDate = new Date();

                    for(var z=0; z < paymentDataArr.length; z++){
                        var paymentBTId = paymentDataArr[z].btId;
                        var fldId = record.submitFields({
                            type: 'customrecord_ch_bt_staging',
                            id: parseInt(paymentDataArr[z].btId),
                            values: {
                                custrecord_ch_bt_associated_inv: cpRecId,
                                custrecord_ch_bt_processed: true,
                                custrecord_ch_bt_dateprocessed: currDate,
                                custrecord_ch_bt_exception: ""
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields : true
                            }
                        });
                        log.debug('paymentBTId : ',paymentBTId);
                    }//End for loop
                }else if(matchInvFlag==false){
                    CreateUnAppliedCustomerPayment(patientId,customData,paymentDataArr);
                }

          	}catch(ex){
				log.debug('Exception in Customer Payment creation : ',ex.message);
				for(var e=0; e < paymentDataArr.length; e++){
					var fldId = record.submitFields({
						type: 'customrecord_ch_bt_staging',
						id: parseInt(paymentDataArr[e].btId),
						values: {
							custrecord_ch_bt_exception: ex.message
						},
						options: {
							enableSourcing: false,
							ignoreMandatoryFields : true
						}
					});
				}
			}

        }//End function

        function CreateUnAppliedCustomerPayment(patientId,customData,paymentDataArr){

          	log.debug('Start unapplied customer payments');

			var btExtId		= paymentDataArr[0].btExtId;
			var tranDate	= customData.tranDate;
          	var dateOfService= customData.dateOfService;
          	var btTranType	= customData.btTranType;
          	var btTranNo	= customData.btTranNo;
          	var patientKey	= customData.patientKey;
			var patientName	= customData.patientName;
			var insuranceName= customData.insuranceName;
			var payorLevel	= customData.payorLevel;
			var patientBranch= customData.patientBranch;
			var btCity		= customData.btCity;
			var btState		= customData.btState;
			var btZipCode	= customData.btZipCode;
          	var btApplToFrom= customData.btApplToFrom;
          	var btApplAmt	= customData.btApplAmt;
            var btPaymentDate= customData.btPaymentDate;
            var btId        = paymentDataArr[0].btId;

          	var customer	= GetCustomerByPatientId(patientId);
          	log.debug('customer : ',customer);

			//Create Customer Payment
			var customerPaymentObj = record.create({
				type: record.Type.CUSTOMER_PAYMENT,
				isDynamic: true,
				defaultValues: {
					entity: customer
				}
			});

			var lineCount = customerPaymentObj.getLineCount({sublistId: 'apply'});
			log.debug('lineCount cp unapplied : ',lineCount);

          	customerPaymentObj.setValue({fieldId:'payment',value:parseFloat(btApplAmt)});
            if(btPaymentDate){
              	customerPaymentObj.setValue({fieldId:'trandate',value:btPaymentDate});
            }
			else if(tranDate){
              	customerPaymentObj.setValue({fieldId:'trandate',value:tranDate});
                customerPaymentObj.setValue({fieldId:'custbody_ch_bt_transaction_date',value:tranDate});
            }
          	if(dateOfService){
				customerPaymentObj.setValue({fieldId:'custbody_ch_date_of_service',value:dateOfService});
			}
            if(btPaymentDate){
				customerPaymentObj.setValue({fieldId:'custbody_cala_bt_payment_date',value:btPaymentDate});
			}
          	customerPaymentObj.setValue({fieldId:'custbody_ch_bt_tran_type',value:btTranType});
			customerPaymentObj.setValue({fieldId:'custbody_ch_bt_payment_tran_number',value:btTranNo});
            customerPaymentObj.setValue({fieldId:'custbody_ch_bt_tran_id',value:btTranNo});
			customerPaymentObj.setValue({fieldId:'custbody_ch_sfdc_bt_ext_id',value:btExtId});
			customerPaymentObj.setValue({fieldId:'custbody_ch_pat_key',value:patientKey});
			customerPaymentObj.setValue({fieldId:'custbody_ch_patient_id',value:patientId});
			customerPaymentObj.setValue({fieldId:'custbody_ch_patient_name',value:patientName});
			customerPaymentObj.setValue({fieldId:'custbody_ch_insurer_name',value:insuranceName});
			customerPaymentObj.setValue({fieldId:'custbody_ch_payor_level',value:payorLevel});
			customerPaymentObj.setValue({fieldId:'custbody_ch_pat_branch',value:patientBranch});
			customerPaymentObj.setValue({fieldId:'custbody_ch_inv_city',value:btCity});
			customerPaymentObj.setValue({fieldId:'custbody_ch_bt_inv_state',value:btState});
			customerPaymentObj.setValue({fieldId:'custbody_ch_inv_zip',value:btZipCode});
			customerPaymentObj.setValue({fieldId:'custbody_ch_bt_app',value:btApplToFrom});

            customerPaymentObj.setValue({fieldId:'custbody_sfdc_bt_internal_id',value:btId});

			var cpRecId = customerPaymentObj.save({enableSourcing: false, ignoreMandatoryFields: false});
			log.debug('Successfully created Stand Alone Customer Payment record : ',cpRecId);
			var currDate = new Date();

			for(var z=0; z < paymentDataArr.length; z++){
                  var paymentBTId = paymentDataArr[z].btId;
                  var fldId = record.submitFields({
                      type: 'customrecord_ch_bt_staging',
                      id: parseInt(paymentDataArr[z].btId),
                      values: {
                          custrecord_ch_bt_associated_inv: cpRecId,
                          custrecord_ch_bt_processed: true,
                          custrecord_ch_bt_dateprocessed: currDate,
                          custrecord_ch_bt_exception: ""
                      },
                      options: {
                        enableSourcing: false,
                        ignoreMandatoryFields : true
                      }
              });
              log.debug('paymentBTId : ',paymentBTId);
            }//End for loop

        }

		function CreateCustomerRefund(soRecId,customData,btId,btExtId,btAppliedToFrom){
			var matchCMFlag	= false;
          	try{

				log.debug('Start Customer Refund');

                var tranDate	= customData.tranDate;
              	var dateOfService= customData.dateOfService;
                var btTranType	= customData.btTranType;
                var btTranNo	= customData.btTranNo;
                var patientKey	= customData.patientKey;
                var patientId	= customData.patientId;
                var patientName	= customData.patientName;
                var insuranceName= customData.insuranceName;
                var payorLevel	= customData.payorLevel;
                var patientBranch= customData.patientBranch;
                var btCity		= customData.btCity;
                var btState		= customData.btState;
                var btZipCode	= customData.btZipCode;
                var btApplToFrom= customData.btApplToFrom;
                var btApplAmt	= customData.btApplAmt;
                var btPaymentDate= customData.btPaymentDate;

                /*var fieldLookUp = 	search.lookupFields({
                                        type: search.Type.SALES_ORDER,
                                        id: parseInt(soRecId),
                                        columns: ['entity']
                                    });
                var customer	=	fieldLookUp.entity[0].value;
                log.debug('customer : ',customer);
                */
              	var customer	= GetCustomerByPatientId(patientId);
				log.debug('customer in refund : ',customer);

                var applyId		= 	GetCreditMemoByBTTranNo(btAppliedToFrom);
                if(applyId == 0){
                    applyId 	= 	GetCustomerPaymentByBTTranNo(btAppliedToFrom);
                }
                log.debug('applyId in refund : ',applyId);

                //Create Customer Refund
                var customerRefObj = record.create({
                    type: record.Type.CUSTOMER_REFUND,
                    isDynamic: true,
                    defaultValues: {
                        entity: customer
                    }
                });

                var lineCount = customerRefObj.getLineCount({sublistId: 'apply'});
                log.debug('lineCount cr : ',lineCount);

                //customerRefObj.setValue({fieldId:'payment',value:parseFloat(btApplAmt)});

                /* Get line number of customer refund where the credit memo was applied */
                var lineWithMemo = customerRefObj.findSublistLineWithValue({
                    sublistId: 'apply',
                    fieldId: 'internalid',
                    value: parseInt(applyId)
                });

                if(parseInt(lineWithMemo) > -1){

                    //Select line
                    customerRefObj.selectLine({
                        sublistId: 'apply',
                        line: parseInt(lineWithMemo)
                    });

                    var dueAmt = customerRefObj.getCurrentSublistValue({
                        sublistId: 'apply',
                        fieldId: 'due'
                    });
                    log.debug('dueAmt && btApplAmt : ',dueAmt +' && '+btApplAmt);

                    //Set Line level Loop Return Item
                    customerRefObj.setCurrentSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        value: true
                    });

                    customerRefObj.setCurrentSublistValue({
                        sublistId: 'apply',
                        fieldId: 'amount',
                        value: Math.abs(parseFloat(btApplAmt))
                    });

                    // Save the line in the item sublist.
                    customerRefObj.commitLine({
                        sublistId: 'apply'
                    });

                    var applyAmt = customerRefObj.getCurrentSublistValue({
                        sublistId: 'apply',
                        fieldId: 'amount'
                    });
                    log.debug('applyAmt : ',applyAmt);

                    matchCMFlag = true;
                }

                log.debug('matchCMFlag : ',matchCMFlag);

                if(matchCMFlag==true){
                    if(tranDate){
                        customerRefObj.setValue({fieldId:'trandate',value:tranDate});
                        customerRefObj.setValue({fieldId:'custbody_ch_bt_transaction_date',value:tranDate});
                    }
                  	if(dateOfService){
						customerRefObj.setValue({fieldId:'custbody_ch_date_of_service',value:dateOfService});
					}
                    if(btPaymentDate){
						customerRefObj.setValue({fieldId:'custbody_cala_bt_payment_date',value:btPaymentDate});
					}
                    customerRefObj.setValue({fieldId:'custbody_ch_bt_tran_id',value:btTranNo});
                    customerRefObj.setValue({fieldId:'custbody_ch_created_from',value:soRecId});
                    customerRefObj.setValue({fieldId:'custbody_ch_bt_tran_type',value:btTranType});
                    customerRefObj.setValue({fieldId:'custbody_ch_bt_payment_tran_number',value:btTranNo});
                    customerRefObj.setValue({fieldId:'custbody_ch_sfdc_bt_ext_id',value:btExtId});
                    customerRefObj.setValue({fieldId:'custbody_ch_pat_key',value:patientKey});
                    customerRefObj.setValue({fieldId:'custbody_ch_patient_id',value:patientId});
                    customerRefObj.setValue({fieldId:'custbody_ch_patient_name',value:patientName});
                    customerRefObj.setValue({fieldId:'custbody_ch_insurer_name',value:insuranceName});
                    customerRefObj.setValue({fieldId:'custbody_ch_payor_level',value:payorLevel});
                    customerRefObj.setValue({fieldId:'custbody_ch_pat_branch',value:patientBranch});
                    customerRefObj.setValue({fieldId:'custbody_ch_inv_city',value:btCity});
                    customerRefObj.setValue({fieldId:'custbody_ch_bt_inv_state',value:btState});
                    customerRefObj.setValue({fieldId:'custbody_ch_inv_zip',value:btZipCode});
                    customerRefObj.setValue({fieldId:'custbody_ch_bt_app',value:btApplToFrom});

                    customerRefObj.setValue({fieldId:'custbody_sfdc_bt_internal_id',value:btId});

                    var crRecId = customerRefObj.save({enableSourcing: false, ignoreMandatoryFields: true});
                    log.debug('Successfully created Customer Refund record : ',crRecId);
                    var currDate = new Date();

                    if(crRecId > 0){

                        var fldId = record.submitFields({
                            type: 'customrecord_ch_bt_staging',
                            id: parseInt(btId),
                            values: {
                                custrecord_ch_bt_associated_inv: crRecId,
                                custrecord_ch_bt_processed: true,
                                custrecord_ch_bt_dateprocessed: currDate,
                                custrecord_ch_bt_exception: ""
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields : true
                            }
                        });

                    }
                }/*else{
                  	var fldId = record.submitFields({
                        type: 'customrecord_ch_bt_staging',
                        id: parseInt(btId),
                        values: {
                            custrecord_ch_bt_exception: 'Apply record does not exist in NetSuite.'
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields : true
                        }
                    });
                }*/

            }catch(ex){
				log.debug('Exception in Customer Refund is : ',ex.message);
				var fldId = record.submitFields({
					type: 'customrecord_ch_bt_staging',
					id: parseInt(btId),
					values: {
						custrecord_ch_bt_exception: ex.message
					},
					options: {
						enableSourcing: false,
						ignoreMandatoryFields : true
					}
				});
			}

          	return matchCMFlag;

        }

		function GetInvoiceIds(btInvFilterArr){

			var invIdArr = [];

			var invoiceSearchObj = search.create({
			   type: "invoice",
			   filters: btInvFilterArr,
			   /*[
				  ["type","anyof","CustInvc"], 
				  "AND", 
				  ["mainline","is","T"], 
				  "AND", 
				  [["custbody_ch_bt_tran_id_invoice","is","34927"],"OR",["custbody_ch_bt_tran_id_invoice","is","34927"]]
			   ],*/
			   columns:
			   [
				  search.createColumn({name: "tranid", label: "Document Number"})
			   ]
			});
			var searchResultCount = invoiceSearchObj.runPaged().count;
			log.debug("invoiceSearchObj result count",searchResultCount);
			invoiceSearchObj.run().each(function(result){
			   // .run().each has a limit of 4,000 results
			   var invId = result.id;
			   invIdArr.push(invId);
			   return true;
			});

			return invIdArr;
		}

   		function GetCreditMemoByBTTranNo(btAppliedToFrom){

			var cmId = 0;
			var creditmemoSearchObj = search.create({
			   type: "creditmemo",
			   filters:
			   [
				  ["type","anyof","CustCred"], 
				  "AND", 
				  ["mainline","is","T"], 
				  "AND", 
				  ["custbody_ch_bt_tran_id","is",String(btAppliedToFrom)],
                  "AND", 
				  ["status","anyof","CustCred:A"]
			   ],
			   columns:
			   [
				  search.createColumn({name: "tranid", label: "Document Number"})
			   ]
			});
			var searchResultCount = creditmemoSearchObj.runPaged().count;
			log.debug("creditmemoSearchObj result count",searchResultCount);
			creditmemoSearchObj.run().each(function(result){
			   // .run().each has a limit of 4,000 results
			   cmId = result.id;
			   return false;
			});

			return cmId;
		}
   
   		function GetCustomerPaymentByBTTranNo(btAppliedToFrom){

			var paymentId = 0;
			var customerpaymentSearchObj = search.create({
			   type: "customerpayment",
			   filters:
			   [
				  ["type","anyof","CustPymt"], 
				  "AND", 
				  ["mainline","is","T"], 
				  "AND", 
				  ["custbody_ch_bt_payment_tran_number","is",String(btAppliedToFrom)]
			   ],
			   columns:
			   [
				  search.createColumn({name: "tranid", label: "Document Number"})
			   ]
			});
			var searchResultCount = customerpaymentSearchObj.runPaged().count;
			log.debug("customerpaymentSearchObj result count",searchResultCount);
			customerpaymentSearchObj.run().each(function(result){
			   // .run().each has a limit of 4,000 results
			   paymentId = result.id;
			   return false;
			});

			return paymentId;
		}

   		function GetAppliedInvoice(btApplToFrom){
			var invId="";
			var invoiceSearchObj = search.create({
			   type: "invoice",
			   filters:
			   [
				  ["type","anyof","CustInvc"],
				  "AND",
				  ["mainline","is","T"],
				  "AND",
				  ["custbody_ch_bt_tran_id_invoice","is",btApplToFrom]
			   ],
			   columns:
			   [
				  search.createColumn({name: "tranid", label: "Document Number"})
			   ]
			});
			var searchResultCount = invoiceSearchObj.runPaged().count;
			log.debug("invoiceSearchObj result count",searchResultCount);
			invoiceSearchObj.run().each(function(result){
			   // .run().each has a limit of 4,000 results
			   invId = result.id;
			   return false;
			});

			return invId;
		}

		function GetCustomerByPatientId(patientId){
			
			var custId = "";
			var customerSearchObj = search.create({
			   type: "customer",
			   filters:
			   [
				  ["custentity_ch_brighttree_patient_id","is",String(patientId)]
			   ],
			   columns:
			   [
				  search.createColumn({name: "altname", label: "Name"})
			   ]
			});
			var searchResultCount = customerSearchObj.runPaged().count;
			log.debug("customerSearchObj result count",searchResultCount);
			customerSearchObj.run().each(function(result){
			   // .run().each has a limit of 4,000 results
			   custId = result.id;
			   return false;
			})

			return custId;
		}

   		function GetOtherChargeItem(){

			var itemObj = {};

			var otherchargeitemSearchObj = search.create({
				type: "otherchargeitem",
				filters:
				[
					["type","anyof","OthCharge"]
				],
				columns:
				[
					search.createColumn({
						name: "itemid",
						sort: search.Sort.ASC,
						label: "Name"
					}),
					search.createColumn({name: "displayname", label: "Display Name"}),
					search.createColumn({name: "salesdescription", label: "Description"}),
					search.createColumn({name: "type", label: "Type"}),
					search.createColumn({name: "baseprice", label: "Base Price"}),
					search.createColumn({name: "custitem_atlas_item_planner", label: "Planner"}),
					search.createColumn({name: "custitem_ch_productfamily", label: "Product Family"}),
					search.createColumn({name: "custitem_salesforce_prd_id", label: "YCS: Item SF External ID"}),
					search.createColumn({name: "custitem_ch_related_item", label: "Related Item"}),
					search.createColumn({name: "custitem_ch_related_item", label: "Related Item"})
				]
			});
			var searchResultCount = otherchargeitemSearchObj.runPaged().count;
			log.debug("otherchargeitemSearchObj result count",searchResultCount);
			otherchargeitemSearchObj.run().each(function(result){
			   	// .run().each has a limit of 4,000 results
              	var itemIntId = result.id;
			   	var itemName  = result.getValue({name:'itemid'});
			   	//log.debug('itemName & itemIntId in search : ',itemName +' && '+itemIntId);
			   	if(itemName!=null){
				   	itemName 	= itemName.split(':')[0];
				   	itemObj[itemName] = itemIntId;
			   	}
			   	return true;
			});

			return itemObj;
		}

   		function GetCutOverItem(){

			var itemNameObj = {};
			var customrecord_ch_old_item_mappingsSearchObj = search.create({
				type: "customrecord_ch_old_item_mappings",
				filters:
				[
					["isinactive","is","F"]
				],
				columns:
				[
					search.createColumn({name: "custrecord_ch_old_item_name", label: "Old Item Name"}),
					search.createColumn({name: "custrecord_ch_item_to_be_taken", label: "Item to be taken"})
				]
			});
			var searchResultCount = customrecord_ch_old_item_mappingsSearchObj.runPaged().count;
			log.debug("customrecord_ch_old_item_mappingsSearchObj result count",searchResultCount);
			customrecord_ch_old_item_mappingsSearchObj.run().each(function(result){
				// .run().each has a limit of 4,000 results
				var itemId 	= result.getValue({name:'custrecord_ch_item_to_be_taken'});
				var itemIdN = result.getText({name:'custrecord_ch_item_to_be_taken'});
				var itemName= result.getValue({name:'custrecord_ch_old_item_name'});
				//log.debug('itemId && itemIdN && itemName : ',itemId+' && '+itemIdN +' && '+itemName);
				itemNameObj[itemName] = itemIdN;

				return true;
			});
			return itemNameObj;
		}

   		function GetSerializedInvtItem(){

			//var itemNameObj = {};
          	var itemDataArr = [];

			var customrecord_ch_item_mappingSearchObj = search.create({
				type: "customrecord_ch_item_mapping",
				filters:
				[
					["custrecord_ch_item_id","noneof","@NONE@"],
					"AND",
					["isinactive","is","F"]
				],
				columns:
				[
					search.createColumn({name: "custrecord_ch_item_catelog", label: "SFDC External ID Item Catelog "}),
					search.createColumn({name: "custrecord_ch_item_id", label: "Item"}),
					search.createColumn({name: "custrecord_ch_cate_item", label: "Item Catelog"}),
                  	search.createColumn({
                       name: "internalid",
                       join: "CUSTRECORD_CH_ITEM_ID",
                       label: "NS Item Internal ID"
                    })
				]
			});
			var searchResultCount = customrecord_ch_item_mappingSearchObj.runPaged().count;
			log.debug("customrecord_ch_item_mappingSearchObj result count",searchResultCount);
			customrecord_ch_item_mappingSearchObj.run().each(function(result){
				// .run().each has a limit of 4,000 results
				var itemId  = result.getValue({name:"internalid",join:"CUSTRECORD_CH_ITEM_ID"});
				var itemName= result.getText({name:"custrecord_ch_cate_item"});
				//log.debug('itemId && itemName record avail : ',itemId+' && '+itemName);
				//itemNameObj[itemName] = itemId;
              	itemDataArr.push({"itemId":itemId,"itemName":itemName});
				return true;
			});

          	//return itemNameObj;
          	return itemDataArr;
		}

   		function GetARItemData(){

			var itemNameObj = {};
			var itemSearchObj = search.create({
				type: "item",
				filters:
				[
					["name","haskeywords",":AR"],
					"AND",
					["internalid","noneof","3268"]
				],
				columns:
				[
					search.createColumn({
						name: "itemid",
						sort: search.Sort.ASC,
						label: "Name"
					}),
					search.createColumn({name: "deferredrevenueaccount", label: "Deferred Revenue Account"}),
					search.createColumn({name: "directrevenueposting", label: "Direct Revenue Posting"}),
					search.createColumn({name: "createrevenueplanson", label: "Create Revenue Plans On"}),
					search.createColumn({name: "incomeaccount", label: "Income Account"})
				]
			});
			var searchResultCount = itemSearchObj.runPaged().count;
			log.debug("itemSearchObj result count",searchResultCount);
			itemSearchObj.run().each(function(result){
				// .run().each has a limit of 4,000 results
				var itemId  = result.id;
				var itemName= result.getValue({name:"itemid"});
              	itemName	= itemName.split(':')[0];
				//log.debug('itemId && itemName AR : ',itemId+' && '+itemName);
				itemNameObj[itemName] = itemId;
				return true;
			});

			return itemNameObj;
		}

		function parseAndFormatDateString(date) {
            // Assume Date format is MM/DD/YYYY
            var parsedDateStringAsRawDateObject = format.parse({
                value: date,
                type: format.Type.DATE
            });
            /*var formattedDateString = format.format({
                value: parsedDateStringAsRawDateObject,
                type: format.Type.DATE
            });*/

			return parsedDateStringAsRawDateObject;
        }

		return {
			getInputData: getInputData,
			map: map,
			reduce: reduce,
			summarize: summarize
		};

	});
