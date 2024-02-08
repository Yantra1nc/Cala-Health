/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/**
 * Script Modification Log:
 *
    -- Date -- 					-- Modified By -- 					--Requested By-- 					-- Description --
    05th Feb 2022				Taher								Gautam Mishra				Create RMA in NetSuite.
	05th Feb 2022				Asha								Gautam Mishra				Update fields from SO to RMA
 *
 */

 define(['N/search', 'N/record', 'N/config', 'N/runtime', 'N/format','N/https', 'N/log'],
    function(search, record, config, runtime, format, https, log) {

		function afterSubmit(scriptContext){

			try{

				log.debug('Start RMA');
				var currentRec		= scriptContext.newRecord;
				var currRecordType 	= currentRec.type;
				var i_record_id 	= currentRec.id;
				if(currRecordType && i_record_id)
				{
					var recObj 	= record.load({type:currRecordType,id:i_record_id});

				CreateReturnAuth(i_record_id,recObj);
				}

			}catch(e){
				log.debug('Exception in RMA data send in SFDC :',e.message);
			}

		}//End Main function
		
		function CreateReturnAuth(soId,objSalesOrder){

    	log.debug('Create RMA with cancel flag.');

		//lookup for customer field
		var fieldLookUp = 	search.lookupFields({
			type: search.Type.SALES_ORDER,
			id: parseInt(soId),
			columns: ['entity', 'custbody_ch_sfdc_order_type', 'custbody_ch_order_status', 'custbody_ycs_sfdc_order_number', 'custbody_ch_opportunity','custbody_eid'] //custbody_ch_opportunity
		});
		var customerId	=	fieldLookUp.entity[0].value;
		log.debug('order customerId : ',customerId);
		var sfdcStatus = "", sfdcType = "";

		if(fieldLookUp.custbody_ch_order_status)
			sfdcStatus = fieldLookUp.custbody_ch_order_status[0].value;
		log.debug('order sfdcStatus : ', sfdcStatus);
		var sfdcNumber	=	fieldLookUp.custbody_ycs_sfdc_order_number;
		log.debug('order sfdcNumber : ', sfdcNumber);
		var sfdcOpp	=	fieldLookUp.custbody_ch_opportunity;
		log.debug('order sfdcOpp : ', sfdcOpp);
		if(fieldLookUp.custbody_ch_sfdc_order_type)
			sfdcType	=	fieldLookUp.custbody_ch_sfdc_order_type[0].value;
		log.debug('order sfdcType : ', sfdcType);

    	var soExtId = objSalesOrder.getValue("custbody_eid");
		log.debug('soExtId in RMA ',soExtId);


		//Create Return Auth
		var returnAuthObj = record.create({
			type: record.Type.RETURN_AUTHORIZATION,
			isDynamic: true,
			defaultValues: {
				entity: String(customerId)
			}
		});

    	log.debug("objSalesOrder in RMA", objSalesOrder);

		if(sfdcStatus)
			returnAuthObj.setValue({fieldId: 'custbody_ch_order_status',value: sfdcStatus, ignoreFieldChange: true});
		if(sfdcNumber)
			returnAuthObj.setValue({fieldId: 'custbody_ycs_sfdc_order_number',value: sfdcNumber, ignoreFieldChange: true});
		if(sfdcOpp)
			returnAuthObj.setValue({fieldId: 'custbody_ch_opportunity',value: sfdcOpp, ignoreFieldChange: true});
		if(sfdcType)
			returnAuthObj.setValue({fieldId: 'custbody_ch_sfdc_order_type',value: sfdcType, ignoreFieldChange: true});
    	//log.debug("objSalesOrder in RMA 1 ", JSON.stringify(objSalesOrder));
		var count = objSalesOrder.getLineCount({sublistId:'item'});
		log.debug('lineCount : ',count);

				//Add each line
				for(var lineCount=0; lineCount < count; lineCount++) {

					try{
						var rmaFlag = false;

                      		returnAuthObj.selectNewLine({sublistId: 'item'});

							returnAuthObj.setCurrentSublistValue({
							  sublistId: 'item',
							  fieldId: 'item',
							  value: objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'item',line:lineCount})
							});
							returnAuthObj.setCurrentSublistValue({
							  sublistId: 'item',
							  fieldId: 'quantity',
							  value: parseInt(objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'quantity',line:lineCount}))
							});
							returnAuthObj.setCurrentSublistValue({
							  sublistId: 'item',
							  fieldId: 'rate',
							  value: parseFloat(objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'rate',line:lineCount}))
							});

							returnAuthObj.setCurrentSublistValue({
							  sublistId: 'item',
							  fieldId: 'amount',
							  value: (parseFloat(objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'quantity',line:lineCount})) * parseFloat(objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'rate',line:lineCount})))
							});

                          	returnAuthObj.setCurrentSublistValue({
							  sublistId: 'item',
							  fieldId: 'custcol_leid',
							  value: objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custitem_salesforce_prd_id',line:lineCount})
							});


                            if(objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_type',line:lineCount}) != null 
									&& objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_type',line:lineCount}) != '' 
									&&objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_type',line:lineCount}).equals("Existing")){
									rmaFlag = true;
							}
							returnAuthObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_ch_sfdc_type',
									value: 'Existing'
							});

                      		//Add additional code
                      		returnAuthObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_ch_original_order_external_id',
									value: objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_ch_original_order_external_id',line:lineCount})
							});
                      		returnAuthObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_ch_original_order_product_ext',
									value: objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_ch_original_order_product_ext',line:lineCount})
							});
                      		returnAuthObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_ch_sfdc_type',
									value: objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_type',line:lineCount})
							});
                      		returnAuthObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_item_catelog',
									value: objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_item_catelog',line:lineCount})
							});
                      		returnAuthObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_ch_item_catalog_desc',
									value: objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_ch_item_catalog_desc',line:lineCount})
							});
                      		returnAuthObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_ch_list_price',
									value: objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_ch_list_price',line:lineCount})
							});
                      		returnAuthObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_ch_order_product_number',
									value: objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_ch_order_product_number',line:lineCount})
							});
                      		returnAuthObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_ch_sfdc_copay',
									value: objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_ch_sfdc_copay',line:lineCount})
							});
                      		returnAuthObj.setCurrentSublistValue({
									sublistId: 'item',
									fieldId: 'custcol_leid',
									value: objSalesOrder.getSublistValue({sublistId: 'item',fieldId: 'custcol_leid',line:lineCount})
							});

                      		//End new code

                          	log.debug('rmaFlag in RMA :',rmaFlag);
							if(rmaFlag==true){
								returnAuthObj.commitLine({sublistId: 'item'});
								log.debug('commitLine');
							}
						//}
					}
					catch(exItem){
						log.error("Error adding Line Item to Sales Order", exItem.message);
					}
				}

        returnAuthObj.setValue({fieldId: 'custbody_ch_created_from',value:soId,ignoreFieldChange: true});
    	returnAuthObj.setValue({fieldId: 'custbody_eid',value:soExtId,ignoreFieldChange: true});

		//save the return auth record
		var newRMAId = returnAuthObj.save({enableSourcing: true, ignoreMandatoryFields: true});
		log.debug('Successfully created RMA record Id is : ',newRMAId);
		if(newRMAId > 0){
          	var rmaFldId = record.submitFields({
              	type: 'salesorder',
              	id: soId,
              	values: {
                	custbody_ch_rma_number: newRMAId
              	},
              	options: {
                	enableSourcing: false,
                	ignoreMandatoryFields : true
              	}
            });
          
          	UpdateRMASerialLotNumber(newRMAId);
        }
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
   
   		//Merge code added
		function UpdateRMASerialLotNumber(rmaId){
          
          	log.debug('Start RMA Updation');
			
			var a_item_fulfillment_rec = new Array();
			var a_item_details = new Array();
			var a_item_detail_on_return_auth = new Array();
			//var o_rcrd_obj 	= 'returnauthorization';
			var s_record_type 	= 'returnauthorization';
			var i_record_id 	= rmaId;
			log.debug("Record Type - ID", s_record_type +" - " + i_record_id);
			
			//Load RMA record
			var o_return_authorization_rec = record.load({type:s_record_type,id:i_record_id,isDynamic:true})
			
			var i_created_from = o_return_authorization_rec.getValue({fieldId: "createdfrom"});  
			var i_return_auth_line_count = o_return_authorization_rec.getLineCount({sublistId: 'item'});
			log.debug('i_return_auth_line_count: ',i_return_auth_line_count);
				
			if(!i_created_from)
			{
				var i_associated_rec = o_return_authorization_rec.getValue({fieldId: "custbody_ch_created_from"});
				log.debug('i_associated_rec: ',i_associated_rec);
				i_created_from = parseInt(i_associated_rec);			
			}
				
			if(i_created_from)
			{
				var o_SO_rec = record.load({type:'salesorder',id:parseInt(i_created_from),isDynamic:true});
				var i_so_location = o_SO_rec.getValue({fieldId: "location"});  	//DME == 8
				
				 if(i_so_location)o_return_authorization_rec.setValue({fieldId: "location",value:i_so_location});
				
				if(parseInt(i_return_auth_line_count) > parseInt(0))
				{
					for(var i_ir_line_index=0;i_ir_line_index<i_return_auth_line_count;i_ir_line_index++)
					{
						var i_ir_item = o_return_authorization_rec.getSublistValue({sublistId: 'item',fieldId: 'item',line:i_ir_line_index});
						var s_ir_external_id = o_return_authorization_rec.getSublistValue({sublistId: 'item',fieldId: 'custcol_ch_original_order_product_ext',line:i_ir_line_index});
						log.debug("s_ir_external_id",s_ir_external_id);
						var s_so_line_external_id = o_return_authorization_rec.getSublistValue({sublistId: 'item',fieldId: 'custcol_leid',line:i_ir_line_index});
					
						if(i_ir_item)
						{
                          
                          	o_return_authorization_rec.selectLine({sublistId:'item',line:i_ir_line_index});
							
							var o_serial_lot_search_obj = SearchToGetSrlLotNum(i_ir_item,s_ir_external_id,s_so_line_external_id);
							var i_serial_lot_search_obj = o_serial_lot_search_obj.runPaged().count;
							log.debug("i_serial_lot_search_obj",i_serial_lot_search_obj);
							if(parseInt(i_serial_lot_search_obj)>parseInt(0))
							{
								var o_serial_lot_search_rslt = o_serial_lot_search_obj.run().getRange({start: 0,end: 1000});
								//var s_serial_number = o_inventory_details_search_rslt[0].getText({name:'inventorynumber',join: "inventoryDetail"});
								var s_serial_number = o_serial_lot_search_rslt[0].getValue({name:'custcol_ch_serialnumber'});
								var s_lot_number = o_serial_lot_search_rslt[0].getValue({name:'custcol_ch_lotnumber'});
								log.debug("Item - s_serial_number - s_lot_number", i_ir_item + " - " + s_serial_number +" - " + s_lot_number);
								
								if(s_serial_number){
									try{
										o_return_authorization_rec.setCurrentSublistValue({sublistId:'item',fieldId:'custcol_ch_ns_serial_number', value: s_serial_number});
										o_return_authorization_rec.setCurrentSublistValue({sublistId:'item',fieldId:'custcol_ch_ns_lot_number', value: s_lot_number});
									}
									catch(e_update_inv)
									{
										log.debug('ERROR_UPDATING_INVENTORY_DETAULS',e_update_inv);
									}
								}							
							}
							
							
							
							var o_inventory_details_search_obj = search_to_get_inventory_details(i_ir_item,s_ir_external_id,s_so_line_external_id);
							var i_inventory_details_search_obj = o_inventory_details_search_obj.runPaged().count;
							log.debug("i_inventory_details_search_obj",i_inventory_details_search_obj);
							if(parseInt(i_inventory_details_search_obj)>parseInt(0))
							{
								var o_inventory_details_search_rslt = o_inventory_details_search_obj.run().getRange({start: 0,end: 1000});
								var s_serial_number = o_inventory_details_search_rslt[0].getText({name:'inventorynumber',join: "inventoryDetail"});
			
								log.debug("Item - s_serial_number", i_ir_item + " - " + s_serial_number);
								if(s_serial_number)
								{
									try
									{
										
										//o_return_authorization_rec.selectLine({sublistId:'item',line:i_ir_line_index});
										var i_quantity = o_return_authorization_rec.getCurrentSublistValue({sublistId:'item',fieldId:'quantity'});
										log.debug("i_quantity",i_quantity)
										var o_invntory_details_subRecObj = o_return_authorization_rec.getCurrentSublistSubrecord({sublistId:'item',fieldId:'inventorydetail'});
										log.debug('o_invntory_details_subRecObj: '+o_invntory_details_subRecObj);
									
										o_invntory_details_subRecObj.selectNewLine({sublistId:'inventoryassignment'}); // issueinventorynumber
										o_invntory_details_subRecObj.setCurrentSublistValue({sublistId:'inventoryassignment',fieldId:'receiptinventorynumber',value:s_serial_number});
										o_invntory_details_subRecObj.setCurrentSublistValue({sublistId:'inventoryassignment',fieldId:'quantity',value:parseInt(i_quantity)});
										o_invntory_details_subRecObj.commitLine({sublistId:'inventoryassignment'});
										o_invntory_details_subRecObj.commit();
										o_return_authorization_rec.commitLine({sublistId:'item'});
										
										log.debug("Inventory Details updated", s_serial_number);
										o_return_authorization_rec.selectLine({sublistId:'item',line:i_ir_line_index});
										var o_invntory_details_subRecObj = o_return_authorization_rec.getCurrentSublistSubrecord({sublistId:'item',fieldId:'inventorydetail'});
										log.debug('o_invntory_details_subRecObj: '+o_invntory_details_subRecObj);
										var lineCount = o_invntory_details_subRecObj.getLineCount({sublistId:'inventoryassignment'}); // issueinventorynumber
										log.debug('lineCount: '+lineCount);
										if(lineCount > 0){
											for(var count = 0; count < lineCount; ++count){
												var srlNum = o_invntory_details_subRecObj.getSublistValue({sublistId:'inventoryassignment',fieldId:'receiptinventorynumber',line:count});
												var qty = o_invntory_details_subRecObj.getSublistValue({sublistId:'inventoryassignment',fieldId:'quantity', line: count});
												log.debug(count + '. srlNum - qty ', srlNum +" - "+qty);
											}
										}
									}
									catch(e_update_inv)
									{
										log.debug('ERROR_UPDATING_INVENTORY_DETAULS',e_update_inv);
									}
								}							
							}
						}
					}
				}					
			}
			//Save RMA record
			var updateId = o_return_authorization_rec.save({enableSourcing: true,ignoreMandatoryFields : true});
			log.audit("RMA record updated. " + updateId, "Script Ends here");
			
		}
		
		
		function search_to_get_inventory_details(i_ir_item,s_ir_external_id,s_so_line_external_id)
		{
			var a_INV_SearchFilter = [];
			var a_INV_SearchCloumn = [];
			
			a_INV_SearchFilter.push(search.createFilter({name:'type', operator: search.Operator.ANYOF, values:"ItemShip"}));
			if(s_ir_external_id)
			{
				a_INV_SearchFilter.push(search.createFilter({name:'custcol_leid', operator: search.Operator.IS, values:s_ir_external_id}));
			}
			else
			{
				a_INV_SearchFilter.push(search.createFilter({name:'custcol_leid', operator: search.Operator.IS, values:s_so_line_external_id}));
			}
			a_INV_SearchFilter.push(search.createFilter({name:'item', operator: search.Operator.ANYOF, values:i_ir_item}));
			
			a_INV_SearchCloumn.push(search.createColumn({name: 'inventorynumber',join:'inventoryDetail'}));
			a_INV_SearchCloumn.push(search.createColumn({name: 'item',join:'inventoryDetail'}));
			a_INV_SearchCloumn.push(search.createColumn({name: 'location'}));
			
			var itemfulfillmentSearchObj = search.create({type:'itemfulfillment',columns: a_INV_SearchCloumn,filters: a_INV_SearchFilter});
			return itemfulfillmentSearchObj;
		}
		
		function SearchToGetSrlLotNum(i_ir_item, s_ir_external_id, s_so_line_external_id)
		{
			if(s_ir_external_id){
				
				var a_INV_SearchFilter = [];
				var a_INV_SearchCloumn = [];
				
				a_INV_SearchFilter.push(search.createFilter({name:'type', operator: search.Operator.ANYOF, values:"ItemShip"}));
				//a_INV_SearchFilter.push(search.createFilter({name:'custcol_ch_original_order_product_ext', operator: search.Operator.IS, values:s_ir_external_id}));
				a_INV_SearchFilter.push(search.createFilter({name:'custcol_leid', operator: search.Operator.IS, values:s_ir_external_id}));
				a_INV_SearchFilter.push(search.createFilter({name:'item', operator: search.Operator.ANYOF, values:i_ir_item}));
				a_INV_SearchCloumn.push(search.createColumn({name: 'location'}));
				a_INV_SearchCloumn.push(search.createColumn({name: 'custcol_ch_serialnumber'}));
				a_INV_SearchCloumn.push(search.createColumn({name: 'custcol_ch_lotnumber'}));
				
				var itemfulfillmentSearchObj = search.create({type:'itemfulfillment',columns: a_INV_SearchCloumn,filters: a_INV_SearchFilter});
				
				var resultResult = itemfulfillmentSearchObj.run().getRange({start: 0,end: 1000});
				var resultCount = resultResult.length;
				log.debug("resultCount", resultCount);
				
				//If Search result have any list, the return else search with s_so_line_external_id filter
				if(resultCount > 0){
					return itemfulfillmentSearchObj;
				}else{
					if(s_so_line_external_id){
				
						var a_INV_SearchFilter1 = [];
						var a_INV_SearchCloumn1 = [];
						
						a_INV_SearchFilter1.push(search.createFilter({name:'type', operator: search.Operator.ANYOF, values:"ItemShip"}));
						a_INV_SearchFilter1.push(search.createFilter({name:'custcol_leid', operator: search.Operator.IS, values:s_so_line_external_id}));
						a_INV_SearchFilter1.push(search.createFilter({name:'item', operator: search.Operator.ANYOF, values:i_ir_item}));
						a_INV_SearchCloumn1.push(search.createColumn({name: 'location'}));
						a_INV_SearchCloumn1.push(search.createColumn({name: 'custcol_ch_serialnumber'}));
						a_INV_SearchCloumn1.push(search.createColumn({name: 'custcol_ch_lotnumber'}));
						
						var fulfillmentSearchObj = search.create({type:'itemfulfillment',columns: a_INV_SearchCloumn1,filters: a_INV_SearchFilter1});
						return fulfillmentSearchObj;
					}
				}
				
			}
		}

		//End
		
		return {
			afterSubmit: afterSubmit
		};
	});