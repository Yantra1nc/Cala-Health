/**
 * @NApiVersion 2.x
 * @NScriptType restlet
*/
/*************************************************************
 * File Header
 * Script Type: RESTLet
 * Script Name: YCS: RLS_Trigger_Transaction_Record 
 * File Name: YCS_RLS_Map_Transaction_Record.js
 * Created On: 10/02/2018
 * Modified On: 10/26/2018
 * Created By: Ashabari Jena(Yantra Inc)
 * Description:
 * Responsible to redirect to desired RESTLet to create desired records
 *********************************************************** */
define(['N/search', 'N/https', 'N/http','N/record', 'N/format', 'N/runtime', 'N/url', './YCS_Library', 'N/task'], 
       function(search, https, http, record, format, runtime, url, library, task) {



  var errMsg = '';

  var CUSTOMER_RECORD_ID = "-2";
  var CONTACT_RECORD_ID = "-6";
  var gAccessToken = "";
  var gInstanceURL = "";
  var RECORD_TYPE = "";


  function FetchOpportunityFromSF(context){
    try{
      var response = "";
      log.debug("context", context);
      //context = JSON.parse(context);
      if(context){
        var ObjectNumberTxt="";  
        var IS_ESTIMATE = context['Estimate'];
        var IS_INVOICE = context['Invoice'];
        var IS_PurchaseOrder= context['PurchaseOrder'];

        var FILS = [];
        if (IS_ESTIMATE) {
          ObjectNumberTxt="Estimate";	
          RECORD_TYPE='estimate';
          FILS[FILS.length] = ['custrecord_ns_txn_type', 'anyof', '6']	//	Searching for Estimate transaction object setup
        } else if (IS_INVOICE) {
          ObjectNumberTxt="Invoice";
          RECORD_TYPE='invoice';
          FILS[FILS.length] = ['custrecord_ns_txn_type', 'anyof', '7']	//	Searching for Invoice transaction object setup
        } 
        else if (IS_PurchaseOrder) {
          ObjectNumberTxt="PurchaseOrder";
          RECORD_TYPE='purchaseorder';		  
          FILS[FILS.length] = ['custrecord_ns_txn_type', 'anyof', '15']	//	Searching for Invoice transaction object setup
        }
        else {
          ObjectNumberTxt="Sales Order";
          RECORD_TYPE='salesorder';		   
          FILS[FILS.length] = ['custrecord_ns_txn_type', 'anyof', '31']	//	Searching for Opportunity transaction object setup
        }
        var tranSetupSearchObj = search.create({
          type: 'customrecord_ycs_txn_objectsetup',
          filters : FILS,

          columns : [	
            "internalid", 
            "custrecord_ns_txn_type", 
            "custrecord_sf_tran_rec_type", 
            "custrecord_sf_orderstatus", 
            "custrecord_dehsult_subsidiary_to_be_used",
            "custrecord_default_tran_form",
            "custrecord_default_entity_form",
            "custrecord_default_contact_form"
          ]
        });	

        var tranSetupId = "", nsTranType = "";
        var objSetup = new Object();
        if(tranSetupSearchObj){
          var setupResults = tranSetupSearchObj.run().getRange({start: 0,end: 10});
          log.debug("setupResults", JSON.stringify(setupResults));
          if(setupResults){
            tranSetupId = setupResults[0].getValue("internalid");
            nsTranType = setupResults[0].getValue("custrecord_ns_txn_type");
            //log.debug("tranSetupId - nsTranType", tranSetupId +" - "+ nsTranType);
            //Contains setup object to hold default values while creating records
            objSetup.subsidiary = setupResults[0].getValue("custrecord_dehsult_subsidiary_to_be_used");
            objSetup.tranform = setupResults[0].getValue("custrecord_default_tran_form");
            objSetup.entityform = setupResults[0].getValue("custrecord_default_entity_form");
            objSetup.contactform = setupResults[0].getValue("custrecord_default_contact_form");
            log.debug("objSetup", JSON.stringify(objSetup));
          }
        }
        //Add setup parameter
        context["setup"] = objSetup;
        log.debug("final context before sent", JSON.stringify(context));
        PreFetchTransactionFromSF(context,ObjectNumberTxt);

      }
      log.debug("Parent RESTLet execution Ends here", "Child RESTLet execution must be completed by now.");
      return response;
    }catch(ex){
      log.error("Error in Opportunity Restlet", ex.message);
    }
  }	


  function GetDateValidate(fldValue)
  {
    //Set Body field
    if(fldValue)
    {
      // log.debug("fldValue - Date", fldValue);  

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
          // log.debug("fldValue - Date -newDate", newDate);  
          return newDate;
        }
      }
    }
    return "";
  }

  function SearchOrderRecordType(SFOrderType)
  {
    var OrderType="1";
    if(SFOrderType)
    {
      var customrecord_ns_crt_order_typeSearchObj = search.create({
        type: "customrecord_ns_crt_order_type",
        filters:
        [
          ["isinactive","is","F"],
          "AND",
          ["custrecord_sfdc_order_type","is",SFOrderType]
        ],
        columns:
        [
          "custrecord_ns_order_type"
        ]
      });
      customrecord_ns_crt_order_typeSearchObj.run().each(function(result){
        OrderType=result.getValue("custrecord_ns_order_type");
        return false;
      });
    }
    return OrderType;
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
          ["formulanumeric: CASE WHEN {email} IN ("+emailid+") THEN 1 END","equalto","1"],
          "AND", 
          ["isinactive","is","F"], 
          "AND", 
          ["isjobresource","is","T"], 
          "AND", 
          ["email","isnotempty",""]
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

    }
    return GetEmpObj;
  }
  function PreFetchTransactionFromSF(jsonParam,ObjectNumberTxt) {

    // log.debug("get number of salesorder objects", jsonParam["Sales Order"].length);
    if(jsonParam[ObjectNumberTxt])
    {
      for(var i=0; i < jsonParam[ObjectNumberTxt].length; i++) {
        log.debug("details of objects 1", jsonParam["Operation"]);   
        log.debug("details of objects 2", jsonParam[ObjectNumberTxt][i]);   
        var newContext = JSON.parse('{}');            
        newContext["Operation"] = jsonParam["Operation"];        
        newContext[ObjectNumberTxt] = jsonParam[ObjectNumberTxt][0];        
        newContext["setup"] = jsonParam["setup"];
        log.debug("final newContext after check", JSON.stringify(newContext));
        FetchTransactionFromSFSS(newContext,ObjectNumberTxt);
      }
    }

  }
  function FetchTransactionFromSFSS(jsonParam,typeObj){
    try{
      //get time when script execution starts
      var startTime = new Date();

      var response = "";

      if(jsonParam){

        //Get Opportunity record details from JSON
        //var objOppty = jsonParam.Opportunity;
        var objOppty = jsonParam[typeObj];
        var objSetup = jsonParam.setup;
        log.debug("objSetup", objSetup);
        log.debug("objOppty", objOppty);
        if(objOppty){
          log.debug("inside if", objOppty);
          //As JSON object comes as array of objects, get 1st object from the array
          var recordDetails = objOppty;

          //get Opportunity Salesforce ID
          var sfExtId = recordDetails.custbody_salesforce_ext_id;
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
                response = CreateNewTransactionOrder(recordDetails, objSetup);
              }else{
                //Update existing Sales Order
                response = UpdateExistingTransaction(oldOppId, recordDetails);
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
      return response;
    }catch(ex){
      log.error("Error in Restlet", ex.message);
      errMsg += "Error in Sf ID "+sfExtId+" -> Sales Order record creation: ";
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
        type: "transaction",
        columns: [
          "internalid"
        ],
        filters: [
          search.createFilter({
            name: 'custbody_salesforce_ext_id',
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
  function CreateNewTransactionOrder(objSalesOrder, objSetup){
    try{
      var response = "", newRecordId = "";						

      //Use Field IDs and values to 
      if(objSalesOrder){

        var custId = "";

        var arrContactId = new Array();
        var existingContactRecordIds = new Array();

        //Get SF Customer & Contact ID and fetch resp NS Customer & contact record ID
        var extCustId = objSalesOrder.custbody_eid;
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
            delete objSalesOrder.entitystatus; //Set Pankaj

            //Create New Sales Order record
            newRecordId = CreateTransactionRecord(objSalesOrder, objSetup.tranform);
            if(newRecordId)
            {
              for(var y=0; y< existingContactRecordIds.length; ++y){
                arrContactId.push(existingContactRecordIds[y]);
              }
              //Attach contact on Salesorder
              log.debug("arrContactId.length",arrContactId.length);
              var contactRole = runtime.getCurrentScript().getParameter("custscript_ycs_contact_role");
              for(var z=0; z < arrContactId.length ; ++z) {
                var soconid = record.attach({
                  record: {
                    type: 'contact', 
                    id: arrContactId[z]
                  },
                  to: {
                    type: 'salesorder', 
                    id: newRecordId
                  },
                  attributes:{
                    role: contactRole
                  }
                }); 
                log.debug("soconid",soconid);
              }
            }
          }						
        }else{
          response = "Customer SF ID for this SF Opportunity record is missing. First Link Customer record before creating  Order record!";
        }					
      }				
      if(newRecordId){
        response = "New  Order created successfully in NetSuite: " + newRecordId;
      }else{
        response = "New  Order can't be created due to above mentioned error.";
      }
      return response;
    }catch(ex1){
      log.error("Error in fetching SF JSON and creating  Order", ex1.message);
      errMsg += "Error in fetching SF JSON and creating  Order: " + ex1.message +"\n";
      return "";
    }
  }


  function GetSalesRep(emailid)
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
* Description: search the subsidiary from the configuration record 
* @param: Customer {Object}
* @return: Customer ID {string}
******************************************/
  function searchConfig(config_param)
  {
    var config_subsidiary= "";
    try
    {
      var customrecord_ycs_entity_objectsetupSearchObj = search.create({
        type: "customrecord_ycs_entity_objectsetup",
        filters:
        [
          ["custrecord_ns_entity_type","anyof",config_param], 
          "AND", 
          ["isinactive","is","F"]
        ],
        columns:
        [
          search.createColumn({name: "custrecord_ns_entity_subsidiary", label: "Subsidiary"})
        ]
      });
      var searchResultCount = customrecord_ycs_entity_objectsetupSearchObj.runPaged().count;
      log.debug("customrecord_ycs_entity_objectsetupSearchObj result count",searchResultCount);
      if(itemSearch)
      {
        var itemResults = customrecord_ycs_entity_objectsetupSearchObj.run().getRange({start: 0,end: 10});
        log.debug("itemResults", JSON.stringify(itemResults));
        if(itemResults)
        {
          var itemResult = itemResults[0];
          if(itemResult){
            config_subsidiary = itemResult.getValue("custrecord_ns_entity_subsidiary"); 
            log.debug("config_subsidiary", JSON.stringify(config_subsidiary));
          }
        }
      }
    }
    catch(ex5)
    {
      log.error("Error in searchConfig", ex5.message);
      errMsg += "Error in searchConfig: " + ex5.message + "\n";
      return "Error in searchConfig" + ex5.message;
    }
  }
  /*****************************************
		* Description: Create new customer by using Customer information Object
		* @param: Customer info {Object}
		* @return: Customer ID {string}
		******************************************/
  function CreateCustomer(objCust, objSetup){
    try
    {
      var response = "";
      var config_param = runtime.getCurrentScript().getParameter("custscript_ycs_enitityid_customers");
      log.debug("config_param", config_param);
      //Create Customer
      //Search the Subsidiary from configuration record.
      var configrec=searchConfig(config_param)
      log.debug("configrec==", configrec);

      var objCustomer = record.create({
        type: "customer",
        isDynamic: true
      });
      if(objSetup.subsidiary){
        objCustomer.setValue("subsidiary", objSetup.subsidiary);
        //objCustomer.setValue("subsidiary", objSetup.subsidiary);
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
              if(fldType == "date")
              {
                //Set Body field
                if(fldValue)
                {
                  objCustomer.setValue(prop, GetDateValidate(fldValue));
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

                  if(prop=='custentity_global_account_director__c')
                  {
                    objCustomer.setValue("salesrep", searchresource(fldValue)); 
                  }
                  else
                  {
                    objCustomer.setValue(prop, fldValue);
                  }
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
                  //
                  //
                  if(fldType == "date")
                  {
                    //Set Body field
                    if(fldValue)
                    {
                      addSubRecord.setValue(prop, GetDateValidate(fldValue));
                    }
                  }
                  /*
                  if(fldType == "date"){
                    //Set Body field
                    if(fldValue){	
                      var newDate = parseAndFormatDateString(fldValue);
                      log.debug("newDate", newDate);
                      addSubRecord.setValue(prop, newDate);
                    }
                  }
                  */
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


      //if(objCustomer.getValue('custentity_global_account_director__c'))
      //{
        //objCustomer.setValue('salesrep', GetSalesRep(objCustomer.getValue('custentity_global_account_director__c'))); 
      //}



      var recordId = objCustomer.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
      });
      log.debug("New Customer Record", recordId);				
      if(recordId)
      {
        var search_entity=search_entity_id(CUSTOMER_RECORD_ID)
        log.debug("search_entity====", search_entity);	
        var i_split=search_entity.toString().split("-")
        log.debug("i_split", i_split);

        var i_split_new=i_split[0].toString().split(",")
        log.debug("i_split_new", i_split_new.length);
        if(i_split_new.length>0)
        {
          for(var z=0;z<i_split_new.length;z++)
          {
            var sub_id=i_split_new[z]
            log.debug("sub_id#################", sub_id);
            if(sub_id!=1)
            {
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
        }
        response = "New customer created successfully in NetSuite: " + recordId;
      }
      return recordId;
    }catch(ex4){
      log.error("Error in Creating New Customer", ex4.message);
      errMsg += "Error in Creating New Customer: " + ex4.message + "\n";
      return "Error in Creating New Customer" + ex4.message;
    }
  }
  function search_entity_id(CUSTOMER_RECORD_ID)
  {
    var multisub=""
    try
    {
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
        columns : [	"internalid", 
                   "custrecord_ns_entity_subsidiary",
                  ]
      });	
      if(entitySetupSearchObj){
        var setupResults = entitySetupSearchObj.run().getRange({start: 0,end: 1});
        log.debug("setupResults", JSON.stringify(setupResults));
        if(setupResults)
        {
          //Contains setup object to hold default values while creating records
          multisub = setupResults[0].getValue("custrecord_ns_entity_subsidiary");
          log.debug("multisub - multisub", multisub +" - "+ multisub);
        }
      }
      return multisub;
    }
    catch(e)
    {
      var errString = 'search_project_id ' + e.name + ' : ' + e.type + ' : ' + e.message;
      log.debug({title: 'search_project_id',details: errString});
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
        type: "entity",
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
      if(custSearch)
      {
        var custResults = custSearch.run().getRange({start: 0,end: 10});
        if(custResults)
        {
          var custResult = custResults[0];
          if(custResult)
          {
            existCustomer = custResult.getValue("internalid"); 
            log.debug("existCustomer", existCustomer);
          }

        }
      }
      return existCustomer;
    }catch(ex2){
      log.error("Error checking existing entity record", ex2.message);
      errMsg += "Error checking existing entity record: " + ex2.message + "\n";
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
                  //log.debug("Prop - Prop Value - fldValue", prop + " - " + fldValue + " - " + fldValue);
                  if(fldType == "date")
                  {
                    //Set Body field
                    if(fldValue)
                    {
                      objContact.setValue(prop, GetDateValidate(fldValue));
                    }
                  }
                  /*
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
                  */
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
                      if(fldType == "date")
                      {
                        //Set Body field
                        if(fldValue)
                        {
                          addSubRecord.setValue(prop, GetDateValidate(fldValue));
                        }
                      }
                      /*
                      if(fldType == "date"){
                        //Set Body field
                        if(fldValue){	
                          var newDate = parseAndFormatDateString(fldValue);
                          log.debug("newDate", newDate);
                          addSubRecord.setValue(prop, newDate);
                        }
                      }
                      */
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
  function CreateTransactionRecord(objSalesOrder, transactionFrom){
    try{


      //  delete objSalesOrder.internalid;
      log.debug("objSalesOrder", objSalesOrder);
      //delete objSalesOrder.customer;
      //log.debug("objSalesOrder after deleting customer parameter", JSON.stringify(objSalesOrder));
      var soRecordId = "";

      //Create Sales Order record


      var getcustbody_eid=objSalesOrder.custbody_eid;


      var objSalesRecord = record.create({
        type: RECORD_TYPE,
        isDynamic: true
      });
      objSalesRecord.setValue("customform", transactionFrom); //"349");
      //objSalesRecord.setValue("custbody_end_user", "75808");
      if(objSalesOrder.entity)
      {
        objSalesRecord.setValue("entity", objSalesOrder.entity);
      }



      var fldType = "", fldValue = "", fldId = "", startDate = "", endDate = "";
      for(var prop in objSalesOrder) {

        fldType = "", fldValue = "";
        fldValue = objSalesOrder[prop];

        //Set Main field value
        if(prop != "entity" && prop != "customer" && prop != "OpportunityContactRole" && prop != "WorkOrderLineItem" && prop != "POLineItem" && prop != "SOCommissionsDetail" && prop != "internalid" && prop != "forecasttype"){ 	
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
            log.debug("Prop - Prop Type - fldValue : ", prop + " - " + fldType + " - " + fldValue); 
            if(fldType == "date")
            {
              //Set Body field
              if(fldValue)
              {
                objSalesRecord.setValue(prop, GetDateValidate(fldValue));
              }
            }
            else if(fldType == "percent"){
              //Set Body field
              if(fldValue){	
                objSalesRecord.setValue(prop, fldValue);
              }
            }
            else if(fldType == "select"){

              if(prop=="subsidiary")
              {
                if(fldValue)
                {
                  objSalesRecord.setValue(prop, GetSubsidiaryID(fldValue));
                }
              }
              else if(prop=="custbody_sf_account_mgr" )
              {
                if(fldValue)
                {
                  objSalesRecord.setValue(prop, GetAccountManagerID(fldValue));
                }
              }
              else if(prop=='terms')
              {
                objSalesRecord.setValue(prop, GetTerms(fldValue));
              }
              else if(prop=='custbody_pppmi_buyer')
              {
                objSalesRecord.setValue(prop, GetAccountManagerID(fldValue));
              }
              else if(prop =='custbody_pppmi_inside_sales'){
                //log.debug('fldValue of custbody_pppmi_inside_sales : ',fldValue);
				var insideSalesEmpId = GetAccountManagerID(fldValue);
				//log.debug('insideSalesEmpId : ',insideSalesEmpId);
				objSalesRecord.setValue(prop, insideSalesEmpId);
			  }
              //New code added by Ajay
              else if(prop=='salesrep'){
                //log.debug('fldValue of salesrep : ',fldValue);
                var salesrepEmpId = GetAccountManagerID(fldValue);
                //log.debug('salesrepEmpId : ',salesrepEmpId);

                if(salesrepEmpId){
                  //Add salesrep line item
                  objSalesRecord.selectNewLine({sublistId: 'salesteam'});
                  objSalesRecord.setCurrentSublistValue({
                    sublistId: 'salesteam',
                    fieldId: 'employee',
                    value: parseInt(salesrepEmpId)
                  });
                  objSalesRecord.setCurrentSublistValue({
                    sublistId: 'salesteam',
                    fieldId: 'isprimary',
                    value: true
                  });
                  objSalesRecord.commitLine({sublistId: 'salesteam'});
                }

              }
              //End
              else
              {
                //Set Body field
                if(isNaN(fldValue)){
                  objSalesRecord.setText(prop, fldValue);
                }else{
                  objSalesRecord.setValue(prop, fldValue);
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

                    objSalesRecord.setValue("custbody_frg_freemium", true);
                  }
                  else
                  {

                    objSalesRecord.setValue("custbody_frg_freemium", false);
                  }
                }
                else if(prop=='custbody_pppmi_blanket_order')
                {
                  if(fldValue=="true")
                  {

                    objSalesRecord.setValue("custbody_pppmi_blanket_order", true);
                  }
                  else
                  {

                    objSalesRecord.setValue("custbody_pppmi_blanket_order", false);
                  }
                }
				else if(prop=='custbody_pppmi_po_dropship')
                {
                  if(fldValue=="true")
                  {

                    objSalesRecord.setValue("custbody_pppmi_po_dropship", true);
                  }
                  else
                  {

                    objSalesRecord.setValue("custbody_pppmi_po_dropship", false);
                  }
                }
                else
                {
                  objSalesRecord.setValue(prop, fldValue);

                }

              }
            }
          }catch(ex){
            log.error("Error setting field value", prop);
          }						
        }
      }//For Loop Ends

      //Enter Line Item
      var arrObjItems = objSalesOrder.WorkOrderLineItem;
      if(!arrObjItems)
      {
        arrObjItems=objSalesOrder.POLineItem;
      }
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
                objItem.sfproductid =  objItems.itemid ;// PANKAJ JADAUN Change  //objItems.Product2Id;
                objItem.description = objItems.description;
                var productId = GetItemRecordId(objItem);
                objItems.item = productId;
                objItems.quantity=parseInt(objItems.quantity);
                objItems.rate=parseFloat(objItems.rate);
                objItems.amount = parseFloat(objItems.quantity)* parseFloat(objItems.rate);
                objSalesRecord.selectNewLine({sublistId: 'item'}); //, line:count
                log.debug('objItems',  JSON.stringify(objItems));
                objSalesRecord.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'item',
                  value: objItems.item
                });
                objSalesRecord.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'quantity',
                  value: objItems.quantity
                });
                objSalesRecord.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'rate',
                  value: objItems.rate
                });

                objSalesRecord.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'amount',
                  value: objItems.amount
                });


                delete objItems.item; //Set Pankaj   
                delete objItems.quantity; //Set Pankaj   
                delete objItems.rate; //Set Pankaj   
                delete objItems.amount; //Set Pankaj   
                delete objItems.itemid; //Set Pankaj

                for(var prop in objItems) {

                  //Don't set any field value, if parameter contains capital letter
                  if(library.InitialIsCapital(prop)){
                    //log.debug("Its a SF field, so no need to set field");
                    continue;
                  }	

                  var newfieldValue = objItems[prop];
                  if(prop=="custcol_atlas_contract_start_date" || prop=="custcol_atlas_contract_end_date" || prop=="custcol_pppmi_cargo_ready_rate")
                  {
                    newfieldValue= GetDateValidate(newfieldValue);
                  }
                  //log.debug('prop : ',prop);
                  if(prop=="custcol_pppmi_send_outturn_sample"){
					newfieldValue = newfieldValue == "true" ? true : false;
                    objSalesRecord.setCurrentSublistValue({
                      sublistId: 'item',
                      fieldId: prop,
                      value: newfieldValue
                    });
                  }
                  else if(prop=="custcol_pppmi_agent"){
					objSalesRecord.setCurrentSublistValue({
                      sublistId: 'item',
                      fieldId: prop,
                      value: GetSalesRepId(newfieldValue)
                    });
				  }
                  else if(prop=="custcol_pppmi_comm_amt"){
                    log.debug('custcol_pppmi_comm_amt : ',newfieldValue);
                    objSalesRecord.setCurrentSublistValue({
                      sublistId: 'item',
                      fieldId: prop,
                      value: newfieldValue
                    });
                  }
                  else if(prop!="units"){
                    objSalesRecord.setCurrentSublistValue({
                      sublistId: 'item',
                      fieldId: prop,
                      value: newfieldValue
                    });
                  }

                  //log.debug('item', prop+ ' - '+newfieldValue);
                }
                objSalesRecord.commitLine({sublistId: 'item'});
                log.debug('commitLine');
              }
            }
            catch(exItem){
              log.error("Error adding Line Item to Sales Order", exItem.message);
              errMsg += "Error adding Line Item to Sales Order: " + exItem.message + "\n";
            }
          }
        }
      }


      var arrObjItems = objSalesOrder.SOCommissionsDetail;
      log.debug("arrObjItems for SOCommissionsDetail : ", arrObjItems);
      if(arrObjItems){
        if(arrObjItems.length > 0){
          var objItems = "";
          //Add each line
          for(var lineCount = 0; lineCount < arrObjItems.length; ++lineCount){

            try{
              objItems = "";
              objItems = arrObjItems[lineCount];
              log.debug("Item Object for SOCommissionsDetail : ", JSON.stringify(objItems));
              if(objItems){

                objItems.custrecord_sales_rep = GetSalesRepId(objItems.custrecord_sales_rep);
                objItems.custrecord_so_item = GetOrderNumber(objItems.custrecordpppmi_custom_sfproductline_id,objSalesRecord);


                objSalesRecord.selectNewLine({sublistId: 'recmachcustrecord_commissions_link'}); //, line:count

                delete objItems.internalid; //Set Pankaj   


                for(var prop in objItems) {

                  //Don't set any field value, if parameter contains capital letter
                  if(library.InitialIsCapital(prop)){
                    //log.debug("Its a SF field, so no need to set field");
                    continue;
                  }	

                  var newfieldValue = objItems[prop];
				  if(prop=='custrecord_salesrep_as_supervisor'){
                      if(newfieldValue=="false"){
                        newfieldValue = false;
                      }else{
                        newfieldValue = true;
                      }
                      objSalesRecord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_commissions_link',
                        fieldId: prop,
                        value: newfieldValue
                      });
                  }else{
                      objSalesRecord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_commissions_link',
                        fieldId: prop,
                        value: newfieldValue
                      });
                  }

                  log.debug('recmachcustrecord_commissions_link', prop+ ' - '+newfieldValue);
                }								
                objSalesRecord.commitLine({sublistId: 'recmachcustrecord_commissions_link'});

              }
            }
            catch(exItem){
              log.error("Error adding Line Item to Sales Order", exItem.message);
              errMsg += "Error adding Line Item to Sales Order: " + exItem.message + "\n";
            }
          }
        }
      }





      //Add Sales Rep
      //
      // GetSalesRep(emailid)
	  var countryCode	= objSalesOrder.country;//
      //log.debug('countryCode : ',countryCode);
      var customerInfoD = objSalesOrder.Customer;
      if(customerInfoD)
      {
        var global_account_director__c=customerInfoD.custentity_global_account_director__c;
        if(global_account_director__c)
        {
          objSalesRecord.setValue('salesrep', GetSalesRep(global_account_director__c)); 
        }

      }

      //Add billing & shipping address subrecord on SO
		var billingAdd = objSalesOrder.custbody_pppmi_sf_billing_address;
		if(billingAdd){

			billingAdd = billingAdd.split(';');
          	log.debug('billingAdd : ',billingAdd);

			// Create the subrecord.
			var billingSubRec = objSalesRecord.getSubrecord({
				fieldId: 'billingaddress'
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
				value: billingAdd[1]
			});

			billingSubRec.setValue({
				fieldId: 'addressee',
				value: billingAdd[0]
			});


		}
		var shippingAdd = objSalesOrder.custbody_pppmi_sf_shipping_add;
		if(shippingAdd){

			shippingAdd = shippingAdd.split(';');
          	log.debug('shippingAdd : ',shippingAdd);

			// Create the subrecord.
			var shippingSubRec = objSalesRecord.getSubrecord({
				fieldId: 'shippingaddress'
			});

			// Set values on the subrecord.
			// Set country field first when script uses dynamic mode
			shippingSubRec.setValue({
				fieldId: 'country',
				value: shippingAdd[4]
			});

			shippingSubRec.setValue({
				fieldId: 'city',
				value: shippingAdd[2]
			});

			shippingSubRec.setValue({
				fieldId: 'state',
				value: shippingAdd[3]
			});

			shippingSubRec.setValue({
				fieldId: 'zip',
				value: shippingAdd[5]
			});

			shippingSubRec.setValue({
				fieldId: 'addr1',
				value: shippingAdd[1]
			});

			shippingSubRec.setValue({
				fieldId: 'addressee',
				value: shippingAdd[0]
			});
		}
		//End set address


      //Check Value for Validate

      if(!objSalesRecord.getValue('custbody_eid'))
      {
        objSalesRecord.setValue('custbody_eid',getcustbody_eid);
      }


      log.debug("custbody_frg_order_type_sfdc", objSalesRecord.getValue("custbody_frg_order_type_sfdc"));

      if(objSalesRecord.getValue("custbody_frg_order_type_sfdc"))
      {
        objSalesRecord.setValue("custbody_nsts_order_type",  SearchOrderRecordType(objSalesRecord.getValue("custbody_frg_order_type_sfdc")));
      }
      log.debug("custbody_nsts_order_type", objSalesRecord.getValue("custbody_nsts_order_type"));

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


  function GetOrderNumber(LineId,rec) {


    var index = rec.findSublistLineWithValue({"sublistId": "item", "fieldId": "custcol_leid", "value": LineId});
    if(index>=0)
    {
      return rec.getSublistValue({
        sublistId: 'item',
        fieldId: 'item',
        line: index
      });
    }

    return "";
  }
  function GetSalesRepId(externalId) {
    var getEntityId = "";
    if (externalId) {
      var SearchObj = search.create({
        type: "entity",
        filters: ["custentity_external_id", "is", externalId]
      });

      SearchObj.run().each(function(result) {
        getEntityId = result.id;
        return true;
      });
    }
    return getEntityId;
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

  function GetAccountManagerID(AccountManagerEmail)
  {
    var GetEmpId="";
    try
    {
      var employeeSearchObj = search.create({
        type: "employee",
        filters:
        [
          ["email","is",AccountManagerEmail], 
          "AND", 
          ["isinactive","is","F"]
        ]
      });
      var searchResultCount = employeeSearchObj.runPaged().count;
      log.debug("employeeSearchObj result count",searchResultCount);
      employeeSearchObj.run().each(function(result){
        GetEmpId=result.id;
        return false;
      });


    }
    catch(ex1)
    {

    }
    return GetEmpId;
  }

  function GetItemRecordId(objSFItemInfo){
    try{
      log.debug("Check Item record if exists", JSON.stringify(objSFItemInfo));
      var productId = "";
      var extId = GetItemUsingExtId(objSFItemInfo.sfproductid);
      log.debug("Item extId", extId);
      if(extId){
        productId = extId;
      }
      return productId;
    }catch(exItem){
      log.error("Error getting Item record ID from NetSuite", exItem.message);
      errMsg += "Error getting Item record ID from NetSuite: " + exItem.message + "\n";
      return "";
    }
  }

  function GetItemUsingExtId(sfItemId){
    try{
      log.debug("Item Sf ID", sfItemId);
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
      if(itemSearch)
      {
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

  function UpdateExistingTransaction(oldOppId, objSalesOrder){
    try{

      var response = "";
      //Create Customer
      var objSalesRecord = record.load({
        type: RECORD_TYPE, //"opportunity",
        id: oldOppId,
        isDynamic: true
      });
      var arrSOMainFlds = Object.getOwnPropertyNames(objSalesOrder);
      log.debug("arrSOMainFlds", arrSOMainFlds);

      var fldType = "", fldValue = "", fldId = "";
      for(var prop in objSalesOrder) {


        if(prop != "entity" && prop != "customer" && prop != "OpportunityContactRole" && prop != "WorkOrderLineItem" && prop != "internalid" && prop != "forecasttype"){

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
              if(fldType == "date")
              {
                //Set Body field
                if(fldValue)
                {
                  objSalesRecord.setValue(prop, GetDateValidate(fldValue));
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

                log.debug(prop, fldValue);

                if(prop=='terms')
                {
                  objSalesRecord.setValue(prop, GetTerms(fldValue));
                }
                else if(prop=='custbody_pppmi_buyer')
              	{
                	objSalesRecord.setValue(prop, GetAccountManagerID(fldValue));
              	}
                /*else if(prop=='salesrep')
				{
					log.debug('salesrep setting value in updation is : ',prop +' & '+fldValue);
					if(fldValue!="" && fldValue!=null){
						objSalesRecord.setText(prop, String(fldValue).trim());
					}
				}*/
                else
                {

                  if(isNaN(fldValue)){
                    log.debug(prop+' : TXT', fldValue);
                    objSalesRecord.setText(prop, fldValue);
                  }else{
                    log.debug(prop+' : VAL', fldValue);
                    objSalesRecord.setValue(prop, fldValue);
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

                      objSalesRecord.setValue("custbody_frg_freemium", true);
                    }
                    else
                    {

                      objSalesRecord.setValue("custbody_frg_freemium", false);
                    }
                  }
                  else if(prop=='custbody_pppmi_blanket_order')
				  {
					  if(fldValue=="true")
					  {
						objSalesRecord.setValue("custbody_pppmi_blanket_order", true);
					  }
					  else
					  {
						objSalesRecord.setValue("custbody_pppmi_blanket_order", false);
					  }
				  }
				  else if(prop=='custbody_pppmi_po_dropship')
				  {
					  if(fldValue=="true")
					  {
						objSalesRecord.setValue("custbody_pppmi_po_dropship", true);
					  }
					  else
					  {
						objSalesRecord.setValue("custbody_pppmi_po_dropship", false);
					  }
				  }//end
                  else
                  {
                    objSalesRecord.setValue(prop, fldValue);
                  }
                }

              }
            }catch(ex){
              log.error("Error setting field value", prop);
            }						
          }
        }
      }//For Loop Ends



      //Enter Line Item
      var arrObjItems = objSalesOrder.WorkOrderLineItem;
      if(!arrObjItems)
      {
        arrObjItems = objSalesOrder.POLineItem;
      }

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
                objItem.sfproductid =  objItems.itemid ;// PANKAJ JADAUN Change  //objItems.Product2Id;
                objItem.description = objItems.description;
                var productId = GetItemRecordId(objItem);
                objItems.item = productId;
                objItems.quantity=parseInt(objItems.quantity);
                objItems.rate=parseFloat(objItems.rate);
                objItems.amount = parseFloat(objItems.quantity)* parseFloat(objItems.rate);


                var indexLine = objSalesRecord.findSublistLineWithValue({"sublistId": "item", "fieldId": "custcol_leid", "value": objItems.custcol_leid});

                // find returns -1 if the item isn't found
                if (indexLine > -1) {
                  // we found it on line "index"
                } else {





                  objSalesRecord.selectNewLine({sublistId: 'item'}); //, line:count
                  log.debug('objItems',  JSON.stringify(objItems));
                  objSalesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: objItems.item
                  });
                  objSalesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: objItems.quantity
                  });
                  objSalesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: objItems.rate
                  });

                  objSalesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: objItems.amount
                  });


                  delete objItems.item; //Set Pankaj   
                  delete objItems.quantity; //Set Pankaj   
                  delete objItems.rate; //Set Pankaj   
                  delete objItems.amount; //Set Pankaj   
                  delete objItems.itemid; //Set Pankaj

                  for(var prop in objItems) {

                    //Don't set any field value, if parameter contains capital letter
                    if(library.InitialIsCapital(prop)){
                      //log.debug("Its a SF field, so no need to set field");
                      continue;
                    }

                    var newfieldValue = objItems[prop];
                    if(prop=="custcol_atlas_contract_start_date" || prop=="custcol_atlas_contract_end_date" || prop=="custcol_pppmi_cargo_ready_rate")
                    {
                      newfieldValue= GetDateValidate(newfieldValue);
                    }
                    /*objSalesRecord.setCurrentSublistValue({
                      sublistId: 'item',
                      fieldId: prop,
                      value: newfieldValue
                    });*/
                    if(prop=="custcol_pppmi_send_outturn_sample"){
						newfieldValue = newfieldValue == "true" ? true : false;
						objSalesRecord.setCurrentSublistValue({
						  sublistId: 'item',
						  fieldId: prop,
						  value: newfieldValue
						});
					}
                    else if(prop=="custcol_pppmi_agent"){
                      objSalesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: prop,
                        value: GetSalesRepId(newfieldValue)
                      });  
                    }
                    else if(prop=="custcol_pppmi_comm_amt"){
                      objSalesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: prop,
                        value: newfieldValue
                      });
                    }
                    else if(prop!="units"){
						objSalesRecord.setCurrentSublistValue({
						  sublistId: 'item',
						  fieldId: prop,
						  value: newfieldValue
						});
					}

                    log.debug('item', prop+ ' - '+newfieldValue);
                  }								
                  objSalesRecord.commitLine({sublistId: 'item'});
                  log.debug('commitLine');
                }
              }
            }
            catch(exItem){
              log.error("Error adding Line Item to Sales Order", exItem.message);
              errMsg += "Error adding Line Item to Sales Order: " + exItem.message + "\n";
            }
          }
        }
      }



      var arrObjItems = objSalesOrder.SOCommissionsDetail;
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

                objItems.custrecord_sales_rep = GetSalesRepId(objItems.custrecord_sales_rep);
                objItems.custrecord_so_item = GetOrderNumber(objItems.custrecordpppmi_custom_sfproductline_id,objSalesRecord);


                var index = objSalesRecord.findSublistLineWithValue({"sublistId": "recmachcustrecord_commissions_link", "fieldId": "custrecordpppmi_custom_sfcommission_id", "value": objItems.custrecordpppmi_custom_sfcommission_id});
                if(index>=0)
                {
                  objSalesRecord.selectLine({
                    sublistId: 'recmachcustrecord_commissions_link',
                    line: index
                  });
                }
                else
                {

                  objSalesRecord.selectNewLine({sublistId: 'recmachcustrecord_commissions_link'}); //, line:count
                }











                delete objItems.internalid; //Set Pankaj   


                for(var prop in objItems) {

                  //Don't set any field value, if parameter contains capital letter
                  if(library.InitialIsCapital(prop)){
                    //log.debug("Its a SF field, so no need to set field");
                    continue;
                  }	

                  var newfieldValue = objItems[prop];

                  if(prop=='custrecord_salesrep_as_supervisor'){
                      if(newfieldValue=="false"){
                        newfieldValue = false;
                      }else{
                        newfieldValue = true;
                      }
                      objSalesRecord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_commissions_link',
                        fieldId: prop,
                        value: newfieldValue
                      });
                  }else{
					  objSalesRecord.setCurrentSublistValue({
						sublistId: 'recmachcustrecord_commissions_link',
						fieldId: prop,
						value: newfieldValue
					  });
				  }

                  log.debug('recmachcustrecord_commissions_link', prop+ ' - '+newfieldValue);
                }								
                objSalesRecord.commitLine({sublistId: 'recmachcustrecord_commissions_link'});

              }
            }
            catch(exItem){
              log.error("Error adding Line Item to Sales Order", exItem.message);
              errMsg += "Error adding Line Item to Sales Order: " + exItem.message + "\n";
            }
          }
        }
      }







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


  function GetTerms(termsTxt)
  {
    var getTermsID="";
    try
    {
      if(termsTxt)
      {
        var termSearchObj = search.create({
          type: "term",
          filters:
          [
            ["name","is",termsTxt]
          ]
        });
        termSearchObj.run().each(function(result){
          getTermsID=result.id;
          return true;
        });
      }
    }
    catch(er)
    {
      log.error("Error checking Terms", er.message);
    }
    return getTermsID;
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
    put : FetchOpportunityFromSF,
    post : FetchOpportunityFromSF
  }
});


