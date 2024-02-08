/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/task', 'N/log'],
	function(record, search, runtime, task, log){

		function execute(context){
		
			try{
				//Load Transaction Search
				var searchObj = search.load({
					id: 'customsearch_cala_bt_transformed_data__5'
				});
				var searchResultCount = searchObj.runPaged().count;
				log.debug("searchObj result count",searchResultCount);

				var resultIndex = 0;
				var resultStep  = 1000;

				//do{

					var startIndex = parseInt(resultIndex);
					var endIndex = parseInt(resultIndex) + parseInt(resultStep);
					log.debug('startIndex : endIndex : ',startIndex +' : '+endIndex);

					//Get Transaction search results
					var searchResult = searchObj.run().getRange({
						start: startIndex,
						end: endIndex
					});

					// increase pointer
					//resultIndex = parseInt(resultIndex) + parseInt(resultStep);

					//Check search result length
					if(searchResult.length > 0){

						//Search Result loop
						for(var p=0; p< searchResult.length; p++){

							//Get Transaction Rec id
							var recId  	= searchResult[p].id;
							//log.debug('recId :'+p,recId);
							
							DetachApplyRecord(recId);

						}//End searchResult for loop

					}
					/*else if(searchResult.length == 0){
						log.debug('poResultArr.length : ',poResultArr.length);
						log.debug('poResultArr : ',poResultArr);
						return poResultArr;

					}//End SearchResult condition
					*/

				//}while(searchResult.length > 0);

			}catch(e){
				log.debug("Exception in po search is :",e.message);
			}
			
		}//End Main function
		
		function DetachApplyRecord(recId){
		
			var flag 	= false;
			var recObj  = record.load({
							type: 'customerpayment',
							id:recId,
							isDyanmic: true
						});
			//Get Apply Item sublist Line count of credit memo record
			var lineCount = recObj.getLineCount({sublistId: 'apply'});
			//log.debug('record lineCount : ',lineCount);
			for(var a=0; a < lineCount; a++){
				recObj.setSublistValue({sublistId: 'apply',fieldId: 'apply',value: false,line:a,ignoreFieldChange: false});
				flag = true;
			}//End for loop
			
			if(flag==true){
				var recId = recObj.save();
				log.debug("Updated Record ID is : ", recId);
			}
		}
		
		return {
            execute: execute
        };
		
	});