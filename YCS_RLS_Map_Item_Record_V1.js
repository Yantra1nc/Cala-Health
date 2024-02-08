/**
 * @NApiVersion 2.x
 * @NScriptType restlet
*/
define(['N/search', 'N/https', 'N/http','N/record', './YCS_Library'], 
       function(search, https, http, record, library) {

  var TRIGGER_ON_CREATION = "On Record Creation";
  var ITEM_RECORD_ID = "-6";
  var itemErrMsg = "";
  var objItemType = [{"id": "assemblyitem", "name": "Assembly/Bill of Materials"},
                     {"id": "descriptionitem", "name": "Description"},
                     {"id": "discountitem", "name": "Discount"},
                     {"id": "downloaditem", "name": "Download Item"},
                     {"id": "giftcertificateitem", "name": "Gift Certificate"},
                     {"id": "inventoryitem", "name": "Inventory Item"},
                     {"id": "noninventoryitem", "name": "Non-Inventory Item"},
                     {"id": "itemgroup", "name": "Item Group"},
                     {"id": "kititem", "name": "Kit/Package"},
                     {"id": "markupitem", "name": "Markup"},
                     {"id": "otherchargeitem", "name": "Other Charge"},
                     {"id": "paymentitem", "name": "Payment"},
                     {"id": "salestaxitem", "name": "Sales Tax Item"},
                     {"id": "serviceitem", "name": "Service"},
                     {"id": "shipitem", "name": "Shipping Cost Item"},
                     {"id": "subtotalitem", "name": "Subtotal"}];
  function MapItemRecordFromSFToNS(context){
    var response = "";
    try{
      itemErrMsg = "Script Execution Starts for Item record update from Salesforce to NetSuite. \n";
      var startTime = new Date();
      log.debug("context", context);
      if(context){
        //context = JSON.parse(context);
        //record Type
        var arrItemtList = context.Item;
        if(arrItemtList && arrItemtList.length > 0){

          var objItem = arrItemtList[0];						
          var oldItem = "";

          //If record details object presents
          if(objItem){
            log.debug("Item Record Details", JSON.stringify(objItem));

            var sfItemId = objItem.custitem_salesforce_prd_id;
            log.debug("sfItemId", sfItemId);	
            if(sfItemId){

              //For existing Contact
              oldItem = GetItemUsingExtId(sfItemId);
              log.debug("oldItem", oldItem);
              var objItemInfo = GetItemDetails(objItem);
              if(!oldItem){																	
                if(objItemInfo){
                  response = CreateItemRecord(objItemInfo);		
                }									 
              }
              else{ //Contact record exists 
                if(objItemInfo){
                  response = UpdateExistingItem(oldItem, objItemInfo);		
                }								
              }
            }
          }
        }			
      }
      if(itemErrMsg){					
        //library.ErrorEmailLog(156,itemErrMsg);//As of now we are hard coding config id to 156
        //Write in Error Log File
        library.JSONFile(itemErrMsg, startTime,''); 						
      }
      return response;
    }catch(ex){
      log.error("Error in Contact Restlet", ex.message);
      itemErrMsg += "Error in Updating Contact record for Sf ID " + sfItemId + " From SF to NetSuite: ";
      itemErrMsg += ex.message;
      itemErrMsg += '\n';
      //Write in Error Log File
      library.JSONFile(itemErrMsg, startTime, '');
      return "Error in Contact Restlet: "+ ex.message;
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
      itemErrMsg += "Error getting Item ID using SF External ID ID: " + ex3.message + "\n";
      return "";
    }
  }

  function CreateItemRecord(objItemInfo){
    try{
      log.debug('objItemInfo.Type : ',objItemInfo.Type);
      //Create Item Record
      var itemRec = record.create({
        type: objItemInfo.Type,
        isDynamic: true
      });
      itemRec.setValue('subtype', 'Sale');
      var fldType = "", fldValue = "", fldId = "";
      for(var prop in objItemInfo) {

        fldType = "", fldValue = "";
        fldValue = objItemInfo[prop];

        //Set Main field value
        //if(prop != "addressbook" && prop != "addressbookshipping"){
        try{

          //Don't set any field value, if parameter contains capital letter
          if(library.InitialIsCapital(prop)){
            log.debug("Its a SF field, so no need to set field");
            continue;
          }									

          //get Field Type
          fldType = itemRec.getField({
            fieldId: prop
          }).type;
          log.debug("Prop - Prop Type - fldValue", prop + " - " + fldType + " - " + fldValue);  					
          //log.debug("Field type", fldType);
          if(fldType == "date"){

            //Set Body field
            if(fldValue){	
              var newDate = parseAndFormatDateString(fldValue);
              log.debug("newDate", newDate);
              itemRec.setValue(prop, newDate);
            }
          }
          else if(fldType == "percent"){

            //Set Body field
            if(fldValue){	
              itemRec.setValue(prop, fldValue);
            }
          }
          else if(fldType == "select"){
            //Set Body field

            log.debug("Prop - Prop Type - fldValue - Value", prop + " - " + fldType + " - " + fldValue); 

            if(prop=="cseg1")
            {
			  log.debug("cseg1", prop);
              var GetVal_Cseg1=SetProductType(fldValue);
              log.debug("GetVal_Cseg1", GetVal_Cseg1);
              log.debug("cseg1 create : ",GetVal_Cseg1 +" : "+fldValue);
              log.debug("typeofgetval", typeof(GetVal_Cseg1));
              itemRec.setValue(prop,Number(GetVal_Cseg1) );
            }
            else
            {

              if(isNaN(fldValue)){
                itemRec.setText(prop, fldValue);
              }else{
                itemRec.setValue(prop, fldValue);
              }
            }
          }	
          else if(fldType == "multiselect"){
            //Set Body field
            if(isNaN(fldValue)){
              itemRec.setText(prop, [fldValue]);
            }else{
              itemRec.setValue(prop, [fldValue]);
            }
          }
          else if(fldType == "checkbox"){

            if(fldValue=="true" || fldValue==true || fldValue=="T")
            {
              itemRec.setValue(prop,true);
            }
            else
            {
              itemRec.setValue(prop,false);
            }

          }
          else{
            //Set Body field
            if(fldValue){	
              itemRec.setValue(prop, fldValue);
            }
          }
        }catch(ex){
          log.error("Error setting field value: " + prop, ex.message);
        }						
        //}
      }//For Loop Ends									
      log.debug("itemRec", JSON.stringify(itemRec));
      var recordId = itemRec.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
      });
      log.debug("New Item Record", recordId);
    }catch(ex1){
      log.error("Error in create Item record", ex1.message);
      itemErrMsg += "Error in create Item record: " + ex1.message + ". \n";
    }
  }

  function GetItemDetails(objItemInfo){
    try{
      var itemSetupSearchObj = search.create({
        type: 'customrecord_ycs_item_objectsetup',
        /*filters : [
							search.createFilter({
								name: 'custrecord_ns_entity_type',
								operator: search.Operator.ANYOF,
								values: ITEM_RECORD_ID
							})    
						],*/
        columns : [	"internalid", 
                   "custrecord_ns_item_type",  
                   "custrecord_default_item_subsidiary",
                   "custrecord_default_currency",
                   "custrecord_default_asset_account",
                   "custrecord_default_cogs_account",
                   "custrecord_default_income_account"
                  ]
      });	

      var subsidiary = "", currency = "", assetAcc = "", cogsAcc = "", itemType = "", incomeAccount = "";
      var objSetup = new Object();
      if(itemSetupSearchObj){

        var setupResults = itemSetupSearchObj.run().getRange({start: 0,end: 10});
        log.debug("setupResults", JSON.stringify(setupResults));
        if(setupResults){

          //Contains setup object to hold default values while creating records
          subsidiary = setupResults[0].getValue("custrecord_default_item_subsidiary");
          currency = setupResults[0].getValue("custrecord_default_currency");
          assetAcc = setupResults[0].getValue("custrecord_default_asset_account");
          cogsAcc = setupResults[0].getValue("custrecord_default_cogs_account");
          incomeAccount = setupResults[0].getValue("custrecord_default_income_account");
          itemType = setupResults[0].getText("custrecord_ns_item_type");
          log.debug("subsidiary - currency - assetAcc - cogsAcc - itemType - incomeAccount", subsidiary +" - "+ currency +" - "+ assetAcc +" - "+ cogsAcc +" - "+itemType +" - "+incomeAccount);

          //Add default values to be set
          objItemInfo.subsidiary = subsidiary;
          objItemInfo.currency = currency;
          objItemInfo.cogsaccount = cogsAcc;
          objItemInfo.assetaccount = assetAcc;
          if(!objItemInfo.Type){
            objItemInfo.Type = itemType;
          }
          if(objItemInfo.Type){
            var type = objItemType.filter(function(a) { return(a.name == (objItemInfo.Type));})[0].id;
            log.debug("Record Type", type);
            objItemInfo.Type = type;
          }
          objItemInfo.incomeaccount = incomeAccount;
        }
      }
      return objItemInfo;
    }catch(exGet){
      log.error("Error in getting Item record details with default values to be set", exGet.message);
      itemErrMsg += "Error in getting Item record details with default values to be set: " + exGet.message + ". \n";
    }
  }

  function UpdateExistingItem(oldItem, objItemDetails){
    try{			
      //var objItemDetails = GetContactWithAddress(objItemInfo);
      //log.debug("objItemDetails", JSON.stringify(objItemDetails));  
      var response = "";
      //Create Customer
      var itemRec = record.load({
        type: objItemDetails.Type,
        id: oldItem,
        isDynamic: true
      });
      var fldType = "", fldValue = "", fldId = "";
      for(var prop in objItemDetails) {
        fldType = "", fldValue = "";
        fldValue = objItemDetails[prop];


        try{
          //Don't set any field value, if parameter contains capital letter
          if(library.InitialIsCapital(prop)){
            log.debug("Its a SF field, so no need to set field");
            continue;
          }									

          //get Field Type
          fldType = itemRec.getField({
            fieldId: prop
          }).type;

          log.debug("Prop - Prop Type - fldValue", prop + " - " + fldType + " - " + fldValue);  

          //log.debug("Field type", fldType);
          if(fldType == "date"){

            //Set Body field
            if(fldValue){	
              var newDate = parseAndFormatDateString(fldValue);
              log.debug("newDate", newDate);
              itemRec.setValue(prop, newDate);
            }
          }
          else if(fldType == "percent"){

            //Set Body field
            if(fldValue){	
              itemRec.setValue(prop, fldValue);
            }
          }
          else if(fldType == "select"){

            log.debug("Prop - Prop Type - fldValue - Value", prop + " - " + fldType + " - " + fldValue); 
            //Set Body field
            log.debug("prop",prop);
            if(prop == "cseg1")
            {
              log.debug("prop- Set Value",prop);
              var GetVal_Cseg1=SetProductType(fldValue);
              log.debug("cseg1",GetVal_Cseg1 +" : "+fldValue);
              itemRec.setValue(prop,parseInt(GetVal_Cseg1) );
            }
            else
            {

              if(isNaN(fldValue)){
                //log.debug("Prop - Prop Type - fldValue - Text", prop + " - " + fldType + " - " + fldValue);  
                itemRec.setText(prop, fldValue);
              }else{
                //log.debug("Prop - Prop Type - fldValue - Value", prop + " - " + fldType + " - " + fldValue);  
                itemRec.setValue(prop, fldValue);
              }
            }
          }
          else if(fldType == "checkbox"){

            if(fldValue=="true" || fldValue==true || fldValue=="T")
            {
              itemRec.setValue(prop,true);
            }
            else
            {
              itemRec.setValue(prop,false);
            }

          }
          else{
            //Set Body field
            if(fldValue){	
              itemRec.setValue(prop, fldValue);
            }
          }
        }catch(ex){
          log.error("Error setting field value", prop);
        }																				
      }//For Loop Ends	

      //itemRec.setValue("location", "53");	//	US-west
      //itemRec.setValue("taxschedule", "1");	//	S1

      var recordId = itemRec.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
      });
      log.debug("Old Contact updated", recordId);
      if(recordId){
        //response = "Existing Contact updated successfully in NetSuite: " + recordId;
        log.debug("Existing Contact updated successfully in NetSuite: ", recordId)
      }
      return response;
    }catch(ex5){
      log.error("Error in Updating old Contact", ex5.message);
      itemErrMsg += "Error in updating old Contact record: " + ex5.message + ". \n";
      return "Error in Updating old Contact: " + ex5.message;
    }
  }

  function SetProductType(nameTxt)
  {
    log.debug("SetProductType",nameTxt);
    var getProductType="";
    if(nameTxt)
    {
      var SearchObj = search.create({
        type: "customrecord_cseg1",
        filters:
        [
          ["name","is",nameTxt]
        ]
      });
      SearchObj.run().each(function(result){

        getProductType=result.id;
        return true;
      });
    }


    log.debug("getProductType",getProductType);
    return getProductType;
  }
  return {
    post : MapItemRecordFromSFToNS
  }
});




