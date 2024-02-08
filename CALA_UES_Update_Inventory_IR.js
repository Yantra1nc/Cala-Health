/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
/*************************************************************
 * File Header
 * Script Type: User Event Script
 * Script Name: CALA | UES Update Inventory on IR
 * File Name: CALA_UES_Update_Inventory_IR
 * Description: This script is use to update inventory details on Item Receipt record.
 * Current Version: V7
 * Modified
	Version 	Date			User			Reason
	V1			01/17/2023		Asha			Fixing Inventory details setup
	V2			01/20/2023		Asha			Trying to set it before submit ot check if its working
	V3			01/20/2023		Asha			Adding after Submit event for NS support team to troubleshoot
	V4			01/23/2023		Asha			Update code to get IF lines by matching line external id with modified logic
	V6			01/27/2023		Asha			Update code to set RMA number in Item Fulfillment, once RMA record is created 
	V7			01/27/2023		Asha			Update code tocompare column field logic with IF record
 *********************************************************** */
 
define(['N/record', 'N/error', 'N/search', 'N/runtime', 'N/ui/serverWidget','N/config','N/format','N/url','N/https'],

function(record,error,search,runtime,serverWidget,config,format,url,https) {

    function BeforeSubmit_Update_RMA(scriptContext) 
	{
		log.debug("BeforeSubmit_Update_RMA Started = " + scriptContext);
		var o_return_authorization_rec = scriptContext.newRecord;
		var i_created_from = "";
		try
		{
			var a_item_fulfillment_rec = new Array();
			var a_item_details = new Array();
			var a_item_detail_on_return_auth = new Array();
			
			
			i_created_from = o_return_authorization_rec.getValue({fieldId: "createdfrom"});  
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
						log.debug("i_ir_item - s_ir_external_id - s_so_line_external_id", i_ir_item +" - " + s_ir_external_id +" - " + s_so_line_external_id);
						
						if(i_ir_item)
						{
							var o_inventory_details_search_obj = SearchToGetSrlLotNum(i_ir_item,s_ir_external_id,s_so_line_external_id);
							var i_inventory_details_search_obj = o_inventory_details_search_obj.runPaged().count;
							log.debug("i_inventory_details_search_obj",i_inventory_details_search_obj);
							if(parseInt(i_inventory_details_search_obj)>parseInt(0))
							{
								var o_inventory_details_search_rslt = o_inventory_details_search_obj.run().getRange({start: 0,end: 1000});
								//var s_serial_number = o_inventory_details_search_rslt[0].getText({name:'inventorynumber',join: "inventoryDetail"});
								var s_serial_number = o_inventory_details_search_rslt[0].getValue({name:'custcol_ch_serialnumber'});
								var s_lot_number = o_inventory_details_search_rslt[0].getValue({name:'custcol_ch_lotnumber'});
								log.debug("Item - s_serial_number - s_lot_number", i_ir_item + " - " + s_serial_number +" - " + s_lot_number);
								
								if(s_serial_number){
									try{
										o_return_authorization_rec.setSublistValue({sublistId:'item',fieldId:'custcol_ch_ns_serial_number', line:i_ir_line_index, value: s_serial_number});
										o_return_authorization_rec.setSublistValue({sublistId:'item',fieldId:'custcol_ch_ns_lot_number', line:i_ir_line_index, value: s_lot_number});
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
			//var updateId = o_return_authorization_rec.save({enableSourcing: true,ignoreMandatoryFields : true});
			//log.audit("RMA record updated. " + updateId, "Script Ends here");
			log.audit("RMA record updated with Inventory Details ", "Script Ends here");
		
		}
		catch(error){
			log.error('Error Updating RMA record.', error.message);
		}
	}
	
	 function AfterSubmit_Update_RMA(scriptContext) 
	{
		log.debug("AfterSubmit_Update_RMA = " + scriptContext);
		try{
			var a_item_fulfillment_rec = new Array();
			var a_item_details = new Array();
			var a_item_detail_on_return_auth = new Array();
			var o_rcrd_obj 		= scriptContext.newRecord;
			var s_record_type 	= o_rcrd_obj.type;
			var i_record_id 	= o_rcrd_obj.id;
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
										
										o_return_authorization_rec.selectLine({sublistId:'item',line:i_ir_line_index});
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
		catch(error){
			log.error('Error Updating RMA record.', error.message);
		}
		finally{
			try{
			log.debug("Type", scriptContext.type);
			//if(scriptContext.type == "CREATE"){
				log.debug("i_created_from", i_created_from);	
				if(i_created_from){
					var colInternalId = search.createColumn({ name: 'internalid' });
					var colDocumentNumber = search.createColumn({ name: 'tranid' });
					var colCreatedFrom = search.createColumn({ name: 'createdfrom' });
					var colRmaNumber = search.createColumn({ name: 'custbody_ch_rma_number' });
					var objFulfillSearch = search.create({
					  type: 'itemfulfillment',
					  filters: [
						['type', 'anyof', 'ItemShip'],
						'AND',
						['createdfrom', 'anyof', i_created_from],
						'AND',
						['custbody_ch_rma_number', 'anyof', '@NONE@'],
						'AND',
						['mainline', 'is', 'T'],
					  ],
					  columns: [
						colInternalId,
						colDocumentNumber,
						colCreatedFrom,
						colRmaNumber,
					  ],
					});
					
					var fulfillRecId = "";
					// Note: Search.run() is limited to 4,000 results
					objFulfillSearch.run().each(function(result){
						
						fulfillRecId = result.getValue(colInternalId);
					    return false;
					});
					log.debug("fulfillRecId", fulfillRecId)
					
					if(fulfillRecId){
						var fulfillUpdateId = record.submitFields({
														type: record.Type.ITEM_FULFILLMENT,
														id: parseInt(fulfillRecId),
														values: {
															custbody_ch_rma_number:i_record_id
														},
														options: {
															enableSourcing: false,
															ignoreMandatoryFields : true
														}
						});
						log.debug("Item Fulfillment Record Updated with RMA number", fulfillUpdateId);
					}
				}
				
			//}
		}catch(ex){
			log.error("Error updating RMA Number in IF record", ex.message);
		}
		}
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
	
    return {
		beforeSubmit: BeforeSubmit_Update_RMA,
		afterSubmit: AfterSubmit_Update_RMA
    };

});

	
	