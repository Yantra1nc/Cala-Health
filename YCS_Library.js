/**
* YCS_Library.js
* @NApiVersion 2.x
*/
/*************************************************************
 * File Header
 * Script Type: NA
 * Script Name: NA
 * File Name: YCS_Library.js
 * Created On: 04/10/2018
 * Modified On: 10/26/2018
 * Created By: Ashabari Jena(Yantra Inc)
 * Description:
 * This file contains all common functions for SFDC connector application
 *********************************************************** */

define(['N/search', 'N/https', 'N/http','N/file', 'N/encode','N/task','N/runtime','N/record','N/email', 'N/format'],
	function(search, https, http, fileObj, encode, task, runtime, record, email, format){
		
		//Declare Global variables
		var gObjVariables = {
				OPPORTUNITY_RECORD_ID : 37, 
				SALESORDER_RECORDID : 31,
				CONTACT_RECORD_ID : -6,
				CUSTOMER_RECORD_ID : -2
		};
		
		var OPPORTUNITY_RECORD_ID = 37;
		var SALESORDER_RECORDID = 31;
		var CONTACT_RECORD_ID = -6;
		var CUSTOMER_RECORD_ID = -2;
				
		var MODULE_FOLDER = 'SFDC Connector Log';
		var FILENAME = 'SFDC-Connector-Log';
		var gErrLogTxt = "";
		//var objLog = {"exectime":"", "otherlogs":"", "errorlog":""};

	/************************************
	 * Description: Creates or updates Error Log File by
	 * Appending or adding Script Log Data to either existing or newly created file in .txt format
	 * If File already exists, appends to existing content
	 * If not create new file and add content
	 * If file size exceeds 10MB, create new file with appending date and move old date to 
	 * new file and add new date to original file
	 * @param: {myjsontext} JSON string sent for error log
	 * @param: {datetime} starting execution time
	 * @returns: File ID
	***********************************/
	function JSONFile(myjsontext, datetime){
		try{
			var folderName = '';
			var file = '';
			var JSONFile, logFolder, filePath = '';
			
			var folderName = MODULE_FOLDER;
			var JSONFile = FILENAME;
		
			var folderSrch = search.create({
				   type: "folder",
				   columns: [
					  search.createColumn({
						 name: "name",
						 sort: search.Sort.ASC
					  }),
					  "foldersize",
					  "internalid",
					  "lastmodifieddate",
					  "parent",
					  "numfiles"
				   ],
				   filters: [
						search.createFilter({
							name: 'name',
							operator: search.Operator.IS,
							values: [folderName]
						})    
				   ]
				});
			
			var totFolderResult =  folderSrch.run().getRange({start: 0,end: 100});
			var fileId = '';
			if(totFolderResult)	{			
				if(totFolderResult.length >= 1){
					
					logFolder = totFolderResult[0].getValue('internalid');
					log.debug("logFolder ID", logFolder);
					fileId = GetFileId(JSONFile);
					log.debug("Existing file ID", fileId);
				}
			}	
			var txt='';
			
			txt ='--------------Execution Starts Here ---------------------------';
			txt +='\n';
			txt +='Json Output for SFDC Connetor';
			txt+='\n';		
			txt+='-------------------------------------------------------------------';
			txt+='\n';		
			txt+='Execution Start Date/Time: ' + datetime+'\n';
			txt+='Execution End Date/Time: ' + new Date()+'\n';
			txt+= 'Time taken to procces the Records: ' + (new Date()-datetime)/1000 + ' seconds \n';
			txt+='\n';
			txt+= '\n';
			txt+= '\n';

			if(gErrLogTxt){
				
				txt+= '-----------------------Error Message--------------------------';
				txt+= '\n';
				txt+= '\n';
				txt+= gErrLogTxt;
				txt+= '\n';
				txt+= '\n';
				txt+= '----------------------------------------------------------';
				txt+= '\n';
				txt+= '\n';
				txt+= '\n';
				
			}
			
			//If length of the file is greater than 9 MB then the below code will split the JSON file
			
			var index=0;
			var firstPart,secondPart;
			var strLen=0;
			var maxLen = 9180000;
			var jsonTxtLen = myjsontext.length;
			var extChildFile, extParentFile;
			extParentFile = new Date();
			var extFile='', extFileId = 0;
			
			if(jsonTxtLen > maxLen){
				
				var fileItteration = Math.round(jsonTxtLen/maxLen);
				//log.debug('fileItteration',fileItteration+'txt'+txt);
				
				if(fileItteration>0){
					
					for(index=0; index < fileItteration; ++index){
						
						//Checks the string length if it is less than maxumum length then the string length will be intialized to string length
						//log.debug('myjsontext',myjsontext);
						
						strLen = (myjsontext.length > maxLen)? maxLen: myjsontext.length;
						firstPart = myjsontext.substring(0, strLen);
						//log.debug('firstPart',firstPart);
						secondPart = myjsontext.substring(strLen,jsonTxtLen);
						extChildFile = new Date();

						txt+= firstPart;
						txt+='\n';
						txt+='-------------------------------------------------------------------';
						txt+= '\n';
						
						if( index == fileItteration-1){
							txt+= '--Remaining part is stored in --'+JSONFile+'.txt----------';
						}
						else{
							var fileSuffix = index+1;
							txt+= '--Remaining part is stored in --'+JSONFile+'Extension'+extChildFile+fileSuffix+'.txt----------';
							
						}
						extFile = fileObj.create({
							name: JSONFile+'Extension'+extParentFile+index+'.txt',
							fileType: fileObj.Type.PLAINTEXT,
							contents: txt,
							folder: logFolder
						   
						});
						extFileId = extFile.save();
						txt='';
						txt+='\n';
						txt+='-------------------------------------------------------------------------';
						txt+='---Continuation of ' + JSONFile + ' Extension ' + extParentFile + index + '.txt' + '----';
						txt+= '\n';
						txt+= '\n';
						extParentFile = extChildFile;
						myjsontext = secondPart;
					
					}
				} 
			}	 
			else{
				txt+= myjsontext;
			}
			
			var finalFile = '';
			var size = 0;
			var previousLog = '';
			//Error might occur if there is no file in file cabinet
			try{
				//If File Exists
				if(fileId){
					var loadFile = fileObj.load({
						id: fileId
					});
					//Get File size
					size = loadFile.size;
				
					//Returnss the content of the file
					previousLog = loadFile.getContents();
				}				
			}catch(err){
				log.error('Error in Loading file ', err.message);
				gErrLogTxt += err.message;
			}
			//log.audit('JSON File Size', size + ' Length of messaage ' + myjsontext.length);
			
			//Add content to File, if file size less than 10MB
			if(size <= 9500000){
				
				finalFile = txt;
				finalFile +='\n';
				finalFile +='\n';
				finalFile +='******************************Execution Ends Here*****************************************';
				finalFile +='\n\n\n';
				
				//Append old contents
				finalFile +=previousLog;
				
				//IF file size exceeds 10MB while creating file then it will enter catch block 
				try{
					file = fileObj.create({
						name: JSONFile+'.txt',
						fileType: fileObj.Type.PLAINTEXT,
						contents: finalFile,
						folder: logFolder
					   
					});
				}catch(error){
					log.error('Error may be Due to size of file', error.message);
					gErrLogTxt += error.message;
					
					//Create new file with appending time stamp as file name
					var oldLogFile = fileObj.create({
						name: JSONFile+new Date()+'.txt',
						fileType: fileObj.Type.PLAINTEXT,
						contents: previousLog,
						folder : logFolder
					});
					oldLogFile.save();
					//log.debug('oldId in Catch Block',oldId);
					
					//transactionJSON file data will be of present Log data
					file = fileObj.create({
						name: JSONFile+'.txt',
						fileType: fileObj.Type.PLAINTEXT,
						contents: txt
					});	
				}
			}
			//Else create a new file wil time stamp and move old content to new file and add
			//Old content to main file
			else{
				finalFile = previousLog;
				
				//transactionJSON file data is copied to new file 
				var oldLogFile = fileObj.create({
									name: JSONFile+new Date()+'.txt',
									fileType: fileObj.Type.PLAINTEXT,
									contents: finalFile,
									folder:logFolder	   
								});
				oldLogFile.save();
				//log.debug('Old content added to new File of ID', oldId);
				
				//transactionJSON file data will be erased
				file = fileObj.create({
								name: JSONFile+'.txt',
								fileType: fileObj.Type.PLAINTEXT,
								contents: txt,
								folder:logFolder				   
						});
			}
			if(file){
				//Saves file in Cadency Log Files folder
				var id = file.save();
				//log.debug('New content added to Main File of ID', id);
				return id;	
			}else{
				return null;
			}
			log.debug("Please check error log File for details in File Cabinet > SFDC Connector Log > SFDC-Connector-Log.txt");
		}
		catch(ex){
			log.error('Error in JSON File Section', ex.message);
			gErrLogTxt += 'Error occured while Creating JSON File : Netsuite Error -';
			
			gErrLogTxt += ex.message;
			gErrLogTxt += '\n';
			return null;
		}
	}
	
	
		/************************************
		 * Description: Get exixtig file ID by using file name
		 * @param: {fileName} File Name
		 * @returns: File ID
		***********************************/
		function GetFileId(fileName) {
			try{
				var fileId = '';
				var fileSearch = search.load({
					  id: 'customsearch_sfdc_connect_log_file_list'
					 });
				//Add Filter to search
				var filter1 = search.createFilter({
					name: 'name',
					operator: search.Operator.IS,
					values: [fileName+".txt"]
				});
				fileSearch.filters.push(filter1);
				
				var totFileResult =  fileSearch.run().getRange({start: 0,end: 100});
				if(totFileResult){
					if(totFileResult.length >= 1){
						fileId = totFileResult[0].getValue("internalid");
						//log.audit('fileId', fileId);
					}
				}
				return fileId;
			}catch(exFile){
				log.error('Error in getting File ID', exFile.message);
				gErrLogTxt += 'Error occured while getting File ID : Netsuite Error -';
				
				gErrLogTxt += exFile.message;
				gErrLogTxt += '\n';
				return null;
			}
		}
		
		/***********************************************************
		 * Description: Sends email Notifications when any Error Occurs
			@param : {configId}
			@param : {errMsg}	
		 * *******************************************************/	 
		function ErrorEmailLog(configId, errMsg){
			try{
				//log.audit('Inside ErrorEmailLog()', configId +" - "+errMsg);
				var configRec = record.load({
					type:'customrecord_cadency_config_record',
					id:configId
				});
					
				var senderId = configRec.getValue('custrecord_cad_emp_sender');
				var receiverId = configRec.getValue('custrecord_cad_emp_receiver');			
				email.send({
					author:senderId,
					recipients:receiverId,
					subject:'GL Balance Export Error Messages',
					body:'Below are errors occurred while exporting GL Balance to Cadency:	\n'+errMsg
				});
					
				log.audit('Error email sent: senderId - receiverId', senderId +" - "+receiverId);
			}
			catch(ex){
				log.audit('Error in Error Email Log Function',ex.message);
			}
		}
		
		/************************************
		 * Description: Creates dynamic Access token for Salesforce by using credential
		 * to call Salesforce API
		 * @returns: Object
		***********************************/
		function GetToken() {
			try{
				var accessToken = "";
				var instance_url = "";
				var tranFils = new Array();
				var tranCols = new Array();
				var arrAllTranList = new Array();
			
				tranFils.push(search.createFilter({name:"formulatext", formula: "{custrecord_connector_type}", operator:search.Operator.IS, values:"Salesforce"}));			
				//tranFils.push(search.createFilter({name:"custrecord_connector_type", operator:search.Operator.ANYOF, values:lastDayPrd}));				
				var tranSearch = search.create({
						type: "customrecord_ycs_setup_page",
						//filters: tranFils,
						columns: [
							search.createColumn({
								name: 'internalid',
								sort: search.Sort.DESC
							}),
							"custrecord_endpoint_url",
							"custrecord_user_name",
							"custrecord_security_token",
							"custrecord_connector_pwd",
							"custrecord_clientid",
							"custrecord_clientsecret",
							"custrecord_auth_type"
						]
					});
				var clientid = "", clientsecret = "", username = "", password = "", tokenSecret = "", url = "";
				if(tranSearch){
					var setupResults = tranSearch.run().getRange({start: 0,end: 10});
					if(setupResults){
						var setupResult = setupResults[0];
						if(setupResult){
							var setupId = setupResult.getValue("internalid"); 
							log.debug("setupId", setupId);
							clientid = setupResult.getValue('custrecord_clientid');
							clientsecret = setupResult.getValue('custrecord_clientsecret');
							username = setupResult.getValue('custrecord_user_name');
							password = setupResult.getValue('custrecord_connector_pwd');
							tokenSecret = setupResult.getValue('custrecord_security_token');
							url = setupResult.getValue('custrecord_endpoint_url');
							log.debug("clientid - clientsecret - username - password - tokenSecret - url", clientid +" - "+ clientsecret +" - "+ username +" - "+ password +" - "+ tokenSecret + " - "+ url);
							
						}						
					}
				}
				var params = {
						"grant_type": 'password',
						"client_id": clientid,
						"client_secret": clientsecret,
						"username": username,
						"password": password + tokenSecret
				};
				//Setting up Headers 
				var headersArr = [];
				headersArr["Content-Type"] = "application/x-www-form-urlencoded";
			
				var response = null;
				if(url){								
					//log.debug("Before sending request to webservice", Date());
					//https Module
					if(url.indexOf('https://') != -1){
						response = https.post({
							url:url,
							body:params,
							headers:headersArr
						});
					}
					//http Module
					else if(url.indexOf('http://') != -1){
						response = http.post({
							url:url,
							headers:headersArr,
							body:JSON.stringify(params)
						});
					}
				}
				if(response){
					if(response.body){
						var body = response.body;
						var respBody = JSON.parse(body);
						if(respBody.access_token){
							accessToken = respBody.access_token;
						}
						if(respBody.instance_url){
							instance_url = respBody.instance_url;
						}
					}
				}
				return {"token": accessToken, "url": instance_url};
			}catch(ex){
				log.error("error in get token", JSON.stringify(ex));
				gErrLogTxt += "Error getting Access Token for SF: " + ex.messaage + "\n";
				return "";
			}
		}

		/***********************************************************
		 * Description: Check If 1st letter of a word is in uppercase
		 * @param: {word}
		 * @retrun: boolean
		 * *******************************************************/
		function InitialIsCapital( word ){
			return word[0] !== word[0].toLowerCase();
		}
		
		/***********************************************************
		 * Description: Convert any date for to NetSuite Date format
		 * @param: {dateStr}
		 * @param: {dateFormat} - NS Date format
		 * @return: string
		 * *******************************************************/
		function ParseToNSDate(dateStr, dateFormat) {
			try{ 
				var longMonName = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
				var shortMonName = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
				var exDate='';
				log.debug("dateFormat - dateStr", dateFormat + " - " + dateStr);
				var newDate = "";
				if(dateStr){
					var mydate = new Date(dateStr);
					var arrDateInfo = dateStr.split("-");
					var year = arrDateInfo[0];
					var month = arrDateInfo[1];
					var day = arrDateInfo[2];
					newDate = new Date(year, month, day); //month+"/"+day+"/"+year;
					log.debug("newDate", newDate);
				}
				/*if(dateStr){
					var pattern = /(\d{4})\-(\d{2})\-(\d{2})/;
					newDate = new Date(dateStr.replace(pattern,'$1-$2-$3'));
					log.debug("newDate", newDate);
				}*/
				return newDate;
				/*var date = new Date(); //dateStr.split(' ')[0].toString());
				log.debug("1. date", date);
				var date2 = Date.parse(dateStr);
				log.debug("1. date2", date2);
				
				var parsedDateStringAsRawDateObject = format.parse({
					value: dateStr,
					type: format.Type.DATE
				});
				log.debug("parsedDateStringAsRawDateObject", parsedDateStringAsRawDateObject);
				var date3 = new Date(parsedDateStringAsRawDateObject);
				log.debug("date3", date3);
				
				var date1 = format.format({
					value: parsedDateStringAsRawDateObject,
					type: format.Type.DATE
				});
				log.debug("1. date1", date1);
				//date = new Date(date);
				//log.debug("2. date", date);
				/*var date = format.parse({
					value : dateStr,
					type : format.Type.DATETIME
				});*/
				//Checks the Date Format of Netsuite and intialise the exdate depending upon the format
				//var date = new Date(dateStr);
				//log.debug("2. date", date);
				/*var arrDate = new Array();
				switch(dateFormat){
					
					case "DD/MM/YYYY":
						var day = date.getDate();
						if(day.length === 1){
							day = "0" + day;
						}
						var month = date.getMonth() + 1;
						if(month < 10){
							month = "0" + day;
						}
						arrDate.push(day);
						arrDate.push(month);
						arrDate.push(date.getFullYear());
						log.debug("1. dateFormat - date - arrDate", dateFormat + " - " + date +" - "+ arrDate);
						//var arrDate = date.split("/");
						exDate = arrDate[0]+"/" + arrDate[1] + "/" + arrDate[2]; 
						break;
					case "MM/DD/YYYY":
						var day = date.getDate();
						if(day.length === 1){
							day = "0" + day;
						}
						var month = date.getMonth() + 1;
						if(month < 10){
							month = "0" + day;
						}
						arrDate.push(day);
						arrDate.push(month);
						arrDate.push(date.getFullYear());
						log.debug("1. dateFormat - date - arrDate", dateFormat + " - " + date +" - "+ arrDate);
						//var arrDate = date.split("/");
						exDate = arrDate[1] + "/" + arrDate[0] + "/" + arrDate[2]; 
						//exDate = date; 
						break;
					case "DD-Mon-YYYY":
						var day = date.getDate();
						if(day < 10){
							day = "0" + day;
						} 
						var month =  shortMonName[date.getMonth()];
						arrDate.push(day);
						arrDate.push(month);
						arrDate.push(date.getFullYear());
						//var arrDate = date.split("-");
						//var month = parseInt(shortMonName.indexOf(arrDate[1].toUpperCase()))+1;
						exDate = arrDate[0] + "-" + arrDate[1] + "-" + arrDate[2]; 
						//exDate = dd+'-'+shortMonName[mm-1]+'-'+yyyy; 
						break;
					case "DD.MM.YYYY":
						var day = date.getDate();
						if(day < 10){
							day = "0" + day;
						}
						var month = date.getMonth() + 1;
						if(month < 10){
							month = "0" + day;
						}
						arrDate.push(day);
						arrDate.push(month);
						arrDate.push(date.getFullYear());
						log.debug("1. dateFormat - date - arrDate", dateFormat + " - " + date +" - "+ arrDate);
						//var arrDate = date.split("/");
						exDate = arrDate[0]+"." + arrDate[1] + "." + arrDate[2]; 
						break;
					case "DD-MONTH-YYYY":
						var day = date.getDate();
						if(day < 10){
							day = "0" + day;
						} 
						var month =  longMonName[date.getMonth()];
						arrDate.push(day);
						arrDate.push(month);
						arrDate.push(date.getFullYear());
						exDate = arrDate[0] + "-" + arrDate[1] + "-" + arrDate[2]; 
						break;
					case "DD MONTH, YYYY":
						var day = date.getDate();
						if(day < 10){
							day = "0" + day;
						} 
						var month =  longMonName[date.getMonth()];
						arrDate.push(day);
						arrDate.push(month);
						arrDate.push(date.getFullYear());
						exDate = arrDate[0] + " " + arrDate[1] + ", " + arrDate[2];
						break;
					case "YYYY/MM/DD":
						var day = date.getDate();
						if(day < 10){
							day = "0" + day;
						}
						var month = date.getMonth() + 1;
						if(month < 10){
							month = "0" + day;
						}
						arrDate.push(day);
						arrDate.push(month);
						arrDate.push(date.getFullYear());
						log.debug("1. dateFormat - date - arrDate", dateFormat + " - " + date +" - "+ arrDate);
						//var arrDate = date.split("/");
						exDate = arrDate[2]+"/" + arrDate[1] + "/" + arrDate[0]; 
						break;
					case "YYYY-MM-DD":
						var day = date.getDate();
						if(day < 10){
							day = "0" + day;
						}
						var month = date.getMonth() + 1;
						if(month < 10){
							month = "0" + day;
						}
						arrDate.push(day);
						arrDate.push(month);
						arrDate.push(date.getFullYear());
						log.debug("1. dateFormat - date - arrDate", dateFormat + " - " + date +" - "+ arrDate);
						//var arrDate = date.split("/");
						exDate = arrDate[2]+"-" + arrDate[1] + "-" + arrDate[0]; 
						break;
					default : exDate = date;				
				}			
				exDate = date;
				log.debug("Formatted Date in ParseToNSDate", exDate);
				return (exDate);*/
			}
			catch(ex){
				log.error('Error in ParseToNSDate()', ex.message);	
				gErrLogTxt += "Error in ParseToNSDate: " + ex.messaage + "\n";
				return null;
			}
		}
	return{
		ErrorEmailLog: ErrorEmailLog,
		JSONFile: JSONFile,
		GetToken: GetToken,
		InitialIsCapital: InitialIsCapital,
		ParseToNSDate: ParseToNSDate
		
	}
});