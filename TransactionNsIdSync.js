/** 
 *@NApiVersion 2.x
 *@NScriptType workflowactionscript
 */

/*************************************************************
 * File Header
 * Script Type: NA
 * Script Name: NA
 * File Name: customerNsIdSync.js
 * Created On: 09/07/2018
 * Modified On: 09/07/2018
 * Created By: Taher Vohra(Yantra Inc.)
 * Modified By: 
 * Description: Code to connect Update customer id to salesforce
 *********************************************************** */

define(['N/record','N/task','N/runtime','N/format', 'N/search' , './YCS_Library','N/https'],
       function(recObj, task, runtime, format, search, library, https){
  function getRecord(context){
    log.debug("getRecord function execution started");
    var startTime = new Date();
    var errMsg = '';
    var externalId = '';
    var  SfObjectName = "";
    var theUrl="";
    var external_fd_sf="";
    var inputData = {}
    try{
      var scriptObj = runtime.getCurrentScript();

      var SfObjectType = scriptObj.getParameter({
        name: 'custscript_sf_record_type_trns'
      });
      var record = context.newRecord;
      var recId = record.id;

      var recType = record.type;
      log.debug("recId", recId);
      log.debug("recType", recType);


      record = recObj.load({
        type: recType,
        id: recId,
        isDynamic: true,
      });

      var lineCount = record.getLineCount({sublistId: 'item'});
	  log.debug('lineCount : ',lineCount);

      if(recType=='invoice')
      {
        external_fd_sf='custbody_ycs_sf_invoice_externalid';
      }
      else if(recType=='customerpayment')
      {
        external_fd_sf='custbody_salesforce_ext_payment_id';
        var lineNumber = record.findSublistLineWithValue({
          sublistId: 'apply',
          fieldId: 'apply',
          value: true
        });
        if(lineNumber>=0)
        {
          var getInvId= record.getSublistValue({
            sublistId: 'apply',
            fieldId: 'doc',
            line: lineNumber
          });

          if(getInvId)
          {
            var GetSO_Inv = search.lookupFields({
              type: 'invoice',
              id: getInvId,
              columns: ['custbody_ycs_sf_invoice_externalid','custbody_salesforce_ext_id']
            });
            if(GetSO_Inv)
            {
              var GetInvExt=GetSO_Inv.custbody_ycs_sf_invoice_externalid;
              var GetWoExt=GetSO_Inv.custbody_salesforce_ext_id;
              if(GetInvExt)
              {
                inputData['Invoice__c'] = GetInvExt;
              }
              if(GetWoExt)
              {
                inputData['WorkOrder__c'] = GetWoExt;
              }
            }
          }
        }
      }
      else
      {
        external_fd_sf='custbody_salesforce_ext_id';
      }
      externalId = record.getValue(external_fd_sf);//("custbody_opp_eid");
      log.debug("externalId", externalId);
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
      var netsuiteId = record.getText("id");
      log.debug("netsuiteId", netsuiteId);
      var tranid = record.getText("tranid");
      log.debug("tranid", tranid);
      log.debug("SfObjectType", SfObjectType);
      //fetching sfdc api name from configuration
      var Filters=[
        ["custrecord_sfdc_flow_sync_type", "anyof", "2", "3"],
        "AND",
        ["custrecord_field_internalid_ns", "isnotempty", ""],
        "AND",
        ["custrecord_field_internalid_sf", "isnotempty", ""],
        "AND",
        ["custrecord_sf_field_type", "noneof", "@NONE@"],
        "AND",
        ["custrecord_tran_parent_id.custrecord_sf_tran_rec_type", "anyof", SfObjectType],
        "AND",
        ["isinactive","is","F"]
      ];
      if (context.type == 'create')
      {
        Filters.push("AND");
        Filters.push(["custrecord_ns_trigger","is","T"]);
      }
      else
      {
        Filters.push("AND");
        Filters.push(["custrecord_ns_trigger","is","F"]);
      }
      var customrecord_ycs_sf_ns_field_mappingSearchObj = search.create({
        type: "customrecord_ycs_sf_ns_field_mapping",
        filters:Filters ,
        columns: [
          search.createColumn({
            name: "custrecord_field_type_ns",
            sort: search.Sort.ASC
          }),
          "custrecord_field_internalid_ns",
          "custrecord_field_internalid_sf",
          search.createColumn({
            name: "custrecord_sf_tran_rec_type",
            join: "custrecord_tran_parent_id"
          })
        ]
      });
      customrecord_ycs_sf_ns_field_mappingSearchObj.run().each(function(result) {

        SfObjectName = result.getText({
          name: "custrecord_sf_tran_rec_type",
          join: "custrecord_tran_parent_id"
        });
        var getfieldType = result.getValue('custrecord_field_type_ns');
        var nsInternalId = result.getValue("custrecord_field_internalid_ns");
        var sfInternalId = result.getValue("custrecord_field_internalid_sf");


        log.debug("getfieldType  : nsInternalId  : sfInternalId", getfieldType +' : '+nsInternalId +" : "+sfInternalId);

        // log.debug('nsInternalId',nsInternalId);
        if(nsInternalId=='internalid')
        {
          inputData[sfInternalId] = record.id;
        }
        else
        {
          if (getfieldType == '12' || getfieldType == '16') {

            if(nsInternalId=='entity')
            {

              log.debug(nsInternalId,  record.getValue(nsInternalId));
              //log.debug('new vendor : ',context.newRecord.getValue('entity'));

              var fieldLookUp = search.lookupFields({
                type: 'entity',
                id: record.getValue(nsInternalId),
                columns: ['custentity_external_id']
              });

              log.debug(fieldLookUp, fieldLookUp);

              if(fieldLookUp.custentity_external_id)
              {
                inputData[sfInternalId] = fieldLookUp.custentity_external_id;
              }
            }
            else
            {
              inputData[sfInternalId] = record.getText(nsInternalId);
            }
          }else if (getfieldType == '1') {
			if(nsInternalId=='custbody_eid')
            {

              log.debug(nsInternalId,  record.getValue(nsInternalId));
			  log.debug('new vendor : ',context.newRecord.getValue('entity'));

              var fldLookUp = search.lookupFields({
                type: 'entity',
                id: context.newRecord.getValue('entity'),
                columns: ['custentity_external_id']
              });

              log.debug(fldLookUp, fldLookUp);

              if(fldLookUp.custentity_external_id)
              {
                inputData[sfInternalId] = fldLookUp.custentity_external_id;
              }
            }
            else if(nsInternalId=='custbody_salesforce_ext_id'){
				inputData[sfInternalId] = record.getValue(nsInternalId);
			}
			else if(nsInternalId=='tranid'){
				inputData[sfInternalId] = record.getValue(nsInternalId);
			}

		  } else {
            inputData[sfInternalId] = record.getValue(nsInternalId)
          }
        }
        return true;
      });

      if(SfObjectName)
      {

        //update the sobject logic here

        if(externalId)
        {
          theUrl = instance_url + "/services/data/v52.0/sobjects/"+SfObjectName+"/"+externalId+"?_HttpMethod=PATCH";
        }
        else if(recType=='invoice' || recType=='customerpayment')

        {
		           theUrl = instance_url + "/services/data/v52.0/sobjects/"+SfObjectName+"/";
        }

        log.debug("theUrl", theUrl);

        var params =JSON.stringify(inputData);

        log.debug("params", params);
        var authorizationToken  = "Bearer " + access_token;
        log.debug('authorizationToken : ',authorizationToken);

        var headers = {
          "Content-Type": "application/json",
          "Authorization": authorizationToken,
          "Content-Length": params.length
        };
        var restletResponse = https.post({
          url: theUrl,
          body: params,
          headers: headers
        });
        log.debug("restletResponse", restletResponse);
        var updateCustCode = restletResponse.code;
        log.debug("updateCustCode", updateCustCode);
        if(updateCustCode == '200' || updateCustCode == '201'|| updateCustCode == '204') {

          //New code added
            //work order case
            if(SfObjectType=='7'){
                log.debug('lineCount for workorder : ',lineCount);
                for(var v=0; v<lineCount; v++){
                    var lineId   		= record.getSublistValue({sublistId: 'item',fieldId: 'custcol_leid',line: v});
                    var qty   			= record.getSublistValue({sublistId: 'item',fieldId: 'quantity',line: v});
                    var rate  			= record.getSublistValue({sublistId: 'item',fieldId: 'rate',line: v});
                    var committedQty    = record.getSublistValue({sublistId: 'item',fieldId: 'quantitycommitted',line: v});

                    //woLineItemArr.push({"WO_LineItem_Id__c":lineId,"Quantity__c":qty,"SalesPrice__c":rate,"QtyCommitted__c":committedQty});
                    var woLineItemObj	= {"Quantity__c":qty,"SalesPrice__c":rate,"QtyCommitted__c":committedQty};
                    if(lineId)
                    {
                        var SfLineObjectName = 'WorkOrderLineItem';
                        //var woLineUrl = instance_url + "/services/data/v52.0/sobjects/"+SfLineObjectName+"/"+externalId+"?_HttpMethod=PATCH";
                        var woLineUrl = instance_url + "/services/data/v52.0/sobjects/"+SfLineObjectName+"/"+lineId+"?_HttpMethod=PATCH";

                        log.debug("woLineUrl : ", woLineUrl);

                        var lineParams =JSON.stringify(woLineItemObj);

                        log.debug("lineParams : ", lineParams);
                        var authorizationToken  = "Bearer " + access_token;
                        log.debug('authorizationToken : ',authorizationToken);

                        var headersObj = {
                          "Content-Type": "application/json",
                          "Authorization": authorizationToken,
                          "Content-Length": lineParams.length
                        };
                        var woLineResponse = https.post({
                          url: woLineUrl,
                          body: lineParams,
                          headers: headersObj
                        });
                        log.debug("woLineResponse : ", woLineResponse);
                        var responseCode = woLineResponse.code;
                        log.debug("responseCode : ", responseCode);
                    }

                }//End loop for line count
            }
            //End

          var updateCustBody = restletResponse.body;
          log.debug('updateCustBody && externalId : ',updateCustBody +' && '+externalId);
          if(updateCustBody && !externalId)
          {
            log.debug("createCustBody", updateCustBody);
            log.debug("createCustCode", updateCustCode);
            var response = JSON.parse(updateCustBody);
            externalId=response.id.toString();
            log.debug("sfdcId", externalId);
            record.setValue(external_fd_sf,externalId);
            record.save({
              enableSourcing: false,
              ignoreMandatoryFields: true
            });

          }

        } else {
          log.debug("status", "Error occured in Salesforce");
          var updateCustBody = restletResponse.body;
          log.debug("updateCustBody", updateCustBody);
          errMsg += "Error in updating "+SfObjectName+" in  Sf "+externalId+" ->  record updation: ";
          errMsg += updateCustBody;
          errMsg += '\n';
        }
      }
    }

    catch(e)
    {
      log.debug("errorMessage", e.message);
      //nlapiLogExecution('DEBUG','Failed','Fail errorMessage'+e.getMessage);
      errMsg += "Error in "+SfObjectName+" Sf ID "+externalId+" ->  record updation: ";
      errMsg += e.message;
      errMsg += '\n';
    }

    if(errMsg) {
      //Write in Error Log File
      library.JSONFile(errMsg,startTime,'');
      log.debug("write in error file complete");
    }
    log.debug("getRecord function execution ended");
    return true;
  }
  return{
    onAction: getRecord
  };
});