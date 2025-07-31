/**
 * @NApiVersion 2.1
 *@NScriptType MapReduceScript
 *
 */
define(["N/runtime", "N/file", "N/search", "N/record", "./TK - LIB Email.js"], ( runtime, file, search, record, library) => {

    const getInputData = () => {
        const nameProcess= "GET INPUT DATA Completar Informacion";
        var informacion = getParams();

        try {
            var array = [];
            log.debug(nameProcess, "Parametros: " + JSON.stringify(informacion));
            
            if (isEmpty(informacion.json) ) {
                log.error(nameProcess, "ERROR OBTENIENDO EL JSON PARA TRAER LOS OBJETOS.");
                return false;
            }                
            log.debug("Seguimos");
            
            var arrScripts = getScripts(informacion);
            var arrRecords = getRecords(informacion);
            var arrImports = getImports(informacion);
            var arrExtras  = getExtras(informacion);

            array = array.concat(arrScripts); 
            array = array.concat(arrRecords); 
            array = array.concat(arrImports); 
            array = array.concat(arrExtras); 

            if(informacion.delete === "true"){
                var arrScripts = getScriptsDelete(informacion.parent);
                var arrRecords = getRecordsDelete(informacion.parent);
                var arrSubsRec = getSubsRecDelete(informacion.parent);

                array = array.concat(arrScripts); 
                array = array.concat(arrRecords); 
                array = array.concat(arrSubsRec); 
                       
            }
            
            return array;
        } catch (error) {
            log.error(nameProcess, "Error: " + error);
        }
    }

    const map = (context) => {
        var respuesta = {"error": false, "detalles_errores": [], "parent": ''};
        try {
            var resultado = context.value;

            if (!isEmpty(resultado)) {

                var searchResult = JSON.parse(resultado);                
                
                var obj = new Object();
                obj.internalid = searchResult.internalid;
                obj.name = searchResult.name;
                obj.type = searchResult.type;
                obj.country = searchResult.country;
                obj.parent = searchResult.parent;
                obj.object = searchResult.object;

                var clave = obj.object + "|" + obj.name;
                log.debug("mira obj", obj);
                if(obj.object == "Script"){
                    createRegisterScripts(obj);
                }
                
                if(obj.object == "Record"){
                    createRegisterRecords(obj);
                }

                if(obj.object == "Imports"){
                    updateRegisterImports(obj);
                }

                if(obj.type == "Delete"){
                    deleteRegister(obj)
                }
                respuesta.parent = searchResult.parent;
            }

        } catch (error) {
            respuesta.error = true;
            mensaje = "MAP Excepcion Inesperada - Mensaje: " + error.message + ", key: " + context.key;
            respuesta.detalles_errores.push(mensaje);             
            log.error("MAP " + context.key + " - Excepcion", "Mensaje error: " + error.message + ", key: " + clave);
        }
        context.write(clave, respuesta);
    }

    const summarize = (summary) => {
        var nameProcess= "Completar Información",
            FN = "Summarize",
            author = runtime.getCurrentUser(),
            { sendEmail } = library,
            informacion = getParams();


            sendemail = new sendEmail();
            sendemail.init();
        try {
            log.debug("SUMMARIZE INFO - GetInputData Report", JSON.stringify(summary.inputSummary));
            log.debug("SUMMARIZE INFO - Map Report", JSON.stringify(summary.mapSummary));
            log.debug(nameProcess, "Parametros: " + JSON.stringify(informacion));

            var total = 0;
            var arrayMap = [];
            var errorMap = false;
            var parent = "";

            summary.output.iterator().each(function (key, value){
                var respuesta = JSON.parse(value);
                if(respuesta.error == true){
                    errorMap = true;
                    arrayMap.push(respuesta.detalles_errores);
                    total++;
                }
                return true;
            });     

            var objEntity = record.load({
                type:"customrecord_tk_configuration_general",
                id: informacion.parent
            });

            objEntity.setValue("custrecord_tk_configuration_general_chec", false)  
            objEntity.setValue("custrecord_tk_configuration_general_stat", false)  
            objEntity.save(); 
            
            log.audit({
                title: "SUMARIZE - INFO",
                details: "Total errores en procesamiento: " + total //+ ", error: " + errorMap + ", arrayErrores: " + JSON.stringify(arrayMap)
            });

            var respuesta = new Object();
            respuesta.error = false;
            respuesta.message = null;

            if (summary.inputSummary.error) {
                var e = error.create({
                    name: "INPUT_STAGE_FAILED",
                    message: summary.inputSummary.error
                });

                body = "Ocurrio un error con la siguiente informacion : \n" +
                "Codigo de Error: " + e.name + "\n" +
                "Mensaje de Error: " + e.message;

                sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, false, false, body));
                
                respuesta.error = true;
                respuesta.message = body;
            } else {

                if(errorMap){
                    var errorString = JSON.stringify(arrayMap);
                    errorString = errorString.replace(/,/g, "\n").replace(/\[|\]|\"/g, "");

                    body = "Ocurrio un error al intentar resgistrar el : \n\n" + errorString;
                    
                    sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, false, false, body));
                
                    respuesta.error = true;
                    respuesta.message = body;                            
                }else{
                    sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, false, true));
                
                    respuesta.message = "";                            
                }
                
            }


        } catch (error) {
            log.error("Summarize cath error", error.message);
            sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyCatch(nameProcess, error));
        }  
    }

    const updateRegisterImports = (params) => {
        var objRecord = record.load({
            type: "customrecord_tk_configuration_imports",
            id: params.internalid,
        });

        objRecord.setValue({
            fieldId: "custrecord_tk_configuration_import_paren",
            value: params.parent
        });

        objRecord.save();
    }
    
    const deleteRegister = (params) => {
        record.delete({
            type: params.object,
            id: params.internalid,
        });
    }

    const createRegisterScripts = (params) => {
        var objRecord = record.create({
            type: "customrecord_tk_configuration_scripts",
            isDynamic: true
        });
        

        objRecord.setValue({
            fieldId: "custrecord_tk_configuration_script_list",
            value: params.internalid
        });

        objRecord.setValue({
            fieldId: "custrecord_tk_configuration_script_coun",
            value: params.country
        });

        objRecord.setValue({
            fieldId: "custrecord_tk_configuration_script_paren",
            value: params.parent
        });

        objRecord.save();
    }

    const createRegisterRecords = (params) => {
        try {
            var objRecord = record.create({
                type: "customrecord_tk_configuration_records",
                isDynamic: true
            });
            
    
            objRecord.setValue({
                fieldId: "custrecord_tk_configuration_rec_records",
                value: params.internalid
            });
    
            objRecord.setValue({
                fieldId: "custrecord_tk_configuration_rec_country",
                value: params.country
            });
    
            objRecord.setValue({
                fieldId: "custrecord_tk_configuration_rec_parent",
                value: params.parent
            });
    
            objRecord.save();

            var params = params;
            createRegisterSubRec(params);
        } catch (error) {
            log.error("ERROR - createRegisterRecords", params)
            log.error("ERROR - createRegisterRecords", error)
        }
        
    }

    const createRegisterSubRec = (params) => {
        try {
            var objRecord = record.load({
                type: "customrecordtype", 
                id: params.internalid
            });
    
            var numLines = objRecord.getLineCount({sublistId: "customfield"});
            
            for (var j = 0; j < numLines; j++) {
                var field = objRecord.getSublistValue({
                    sublistId: "customfield",
                    fieldId: "fieldtype",
                    line: j
                });

                var list = objRecord.getSublistValue({
                    sublistId: "customfield",
                    fieldId: "fieldlist",
                    line: j
                });
                if((field == "Multiple Select" || field =="Selección múltiple") && (list == "Subsidiary" || list == "Subsidiaria")){
                    let scriptID = objRecord.getSublistValue({
                        sublistId: "customfield",
                        fieldId: "fieldcustcodeid",
                        line: j
                    });
                    log.debug("Registros con SUBS", JSON.stringify(params) + ' ->> ' + scriptID)
                    var objRecord = record.create({
                        type: "customrecord_tk_configuration_sub_rec",
                        isDynamic: true
                    });
                    
            
                    objRecord.setValue({
                        fieldId: "custrecord_tk_configuration_sr_record",
                        value: params.internalid
                    });
            
                    objRecord.setValue({
                        fieldId: "custrecord_tk_configuration_sr_country",
                        value: params.country
                    });
            
                    objRecord.setValue({
                        fieldId: "custrecord_tk_configuration_sr_parent",
                        value: params.parent
                    });

                    objRecord.setValue({
                        fieldId: "custrecord_tk_configuration_sr_field",
                        value: scriptID
                    });
            
                    objRecord.save();
                }
            }
        } catch (error) {
            log.error("ERROR - createRegisterSubRec", params)
            log.error("ERROR - createRegisterSubRec", error)
        }
        
    }

    const getParams = () => {
        try {
            var informacion = new Object();
            var currScript = runtime.getCurrentScript();
            informacion.json = JSON.parse(currScript.getParameter("custscript_tk_mp_information_input"));
            informacion.country = currScript.getParameter("custscript_tk_mp_information_country");
            informacion.delete = currScript.getParameter("custscript_tk_mp_information_check");
            informacion.parent = currScript.getParameter("custscript_tk_mp_information_parent");

            return informacion;
        } catch (excepcion) {
            log.error("getParams", "INPUT DATA - Excepcion Obteniendo Parametros - Excepcion : " + excepcion.message.toString());
            return null;
        }
    }

    function isEmpty(value) {
        if (value === "") {
            return true;
        }

        if (value === null) {
            return true;
        }

        if (value === undefined) {
            return true;
        }
        return false;
    }

    const getExtras = (information) => {
        var filters  = [],
            filterOR = [],
            result   = [],
            params   = information.json,
            eScripts = params.scripts,
            eRecords = params.records;

        log.debug("miradme", eScripts)
        log.debug("eRecords", eRecords)

        if(eScripts.length != 0){
            eScripts.forEach(element => {
                filterOR.push(["scriptid", "is", element]);
                filterOR.push("OR");
            });

            filterOR.pop();

            filters.push(filterOR);

            var scriptSearch = search.create({
                type: "script",
                filters:filters,
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}), 
                   search.createColumn({name: "name", label: "Name"})
          
                ]
             });
    
            let resultSearch = scriptSearch.run().getRange(0, 1000);
            log.debug("eScripts resultSearch.length",resultSearch.length)
    
            if (resultSearch.length != 0) {
                for (var i in resultSearch) {
                    result.push({
                        object: "Script",
                        type: "",
                        country: information.country,
                        parent: information.parent,
                        name: resultSearch[i].getValue({ name: "name" }),
                        internalid: resultSearch[i].getValue({ name: "internalid" })
                    })
                }
            }
        }

        if(eRecords.length != 0){
            filterOR = [];
            filters = [];
            eRecords.forEach(element => {
                filterOR.push(["scriptid", "is", element]);
                filterOR.push("OR");
            });

            filterOR.pop();

            filters.push(filterOR);

            var scriptSearch = search.create({
                type: "customrecordtype",
                filters:filters,
                columns:
                [
                   search.createColumn({name: "internalid", label: "Internal ID"}),
                   search.createColumn({name: "name", label: "Name"})
                ]
             });
    
            let resultSearch = scriptSearch.run().getRange(0, 1000);
            log.debug("eRecords resultSearch.length",resultSearch.length)
    
            if (resultSearch.length != 0) {
                for (var i in resultSearch) {
                    result.push({
                        object: "Record",
                        type: "",
                        country: information.country,
                        parent: information.parent,
                        name: resultSearch[i].getValue({ name: "name" }),
                        internalid: resultSearch[i].getValue({ name: "internalid" })
                    })
                }
            }
        }
        

        return result;
    }


    const getScripts = (information) => {
        var filters  = [],
            filterOR = [],
            result   = [],
            params   = information.json;

        params.siglas.forEach(element => {
            filterOR.push(["name", "startswith", element]);
            filterOR.push("OR");
        });

        params.scriptid.forEach(element =>{
            filterOR.push(["scriptid", "contains", element]);
        })

        filters.push(filterOR);
        filters.push("AND");
        filters.push(["scripttype","anyof","CLIENT","SCRIPTLET","USEREVENT"]);

        var scriptSearch = search.create({
            type: "script",
            filters:filters,
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}), 
               search.createColumn({name: "name", label: "Name"})
      
            ]
         });

        let resultSearch = scriptSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    object: "Script",
                    type: "",
                    country: information.country,
                    parent: information.parent,
                    name: resultSearch[i].getValue({ name: "name" }),
                    internalid: resultSearch[i].getValue({ name: "internalid" })
                })
            }
        }

        return result;
    }

    const getRecords = (information) => {
        var filters  = [],
            filterOR = [],
            result   = [],
            params   = information.json;

        params.siglas.forEach(element => {
            filterOR.push(["name", "startswith", element]);
            filterOR.push("OR");
        });

        params.scriptid.forEach(element =>{
            filterOR.push(["scriptid", "contains", element]);
        })

        filters.push(filterOR);
        //filters.push("AND");
        //filters.push(["scripttype","anyof","CLIENT","SCRIPTLET","USEREVENT"]);

        var scriptSearch = search.create({
            type: "customrecordtype",
            filters:filters,
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}),
               search.createColumn({name: "name", label: "Name"})
            ]
         });

        let resultSearch = scriptSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    object: "Record",
                    type: "",
                    country: information.country,
                    parent: information.parent,
                    name: resultSearch[i].getValue({ name: "name" }),
                    internalid: resultSearch[i].getValue({ name: "internalid" })
                })
            }
        }

        return result;
    }

    const getImports = (information) => {
        var filters  = [],
            filterOR = [],
            result   = [],
            params   = information.json;

        var scriptSearch = search.create({
            type: "customrecord_tk_configuration_imports",
            filters:[
                ["custrecord_tk_configuration_import_cou", "is", information.country]
            ],
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}),
               search.createColumn({name: "custrecord_tk_configuration_import_rec", label: "Name"})
            ]
         });

        let resultSearch = scriptSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    object: "Imports",
                    type: "",
                    country: information.country,
                    parent: information.parent,
                    name: resultSearch[i].getText({ name: "custrecord_tk_configuration_import_rec" }),
                    internalid: resultSearch[i].getValue({ name: "internalid" })
                })
            }
        }
        log.debug("Result Imports", result)
        return result;
    }

    const getScriptsDelete = (params) => {
        var result   = [];

        var scriptSearch = search.create({
            type: "customrecord_tk_configuration_scripts",
            filters:[
                ["custrecord_tk_configuration_script_paren","is",params]
            ],
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}), 
               search.createColumn({name: "custrecord_tk_configuration_script_list", label: "Name"})
      
            ]
         });

        let resultSearch = scriptSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    object: "customrecord_tk_configuration_scripts",
                    type: "Delete",
                    name: resultSearch[i].getText({ name: "custrecord_tk_configuration_script_list" }),
                    internalid: resultSearch[i].getValue({ name: "internalid" })
                })
            }
        }

        log.debug("getScriptsDelete", result)
        return result;
    }

    const getRecordsDelete = (params) => {
        var result   = [];

        var scriptSearch = search.create({
            type: "customrecord_tk_configuration_records",
            filters:[
                ["custrecord_tk_configuration_rec_parent","is",params]
            ],
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}), 
               search.createColumn({name: "custrecord_tk_configuration_rec_records", label: "Name"})
      
            ]
         });

        let resultSearch = scriptSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    object: "customrecord_tk_configuration_records",
                    type: "Delete",
                    name: resultSearch[i].getText({ name: "custrecord_tk_configuration_rec_records" }),
                    internalid: resultSearch[i].getValue({ name: "internalid" })
                })
            }
        }

        log.debug("getRecordsDelete", result)
        return result;
    }

    const getSubsRecDelete = (params) => {
        var result   = [];

        var scriptSearch = search.create({
            type: "customrecord_tk_configuration_sub_rec",
            filters:[
                ["custrecord_tk_configuration_sr_parent","is",params]
            ],
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}), 
               search.createColumn({name: "custrecord_tk_configuration_sr_record", label: "Name"})
      
            ]
         });

        let resultSearch = scriptSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)

        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                result.push({
                    object: "customrecord_tk_configuration_sub_rec",
                    type: "Delete",
                    name: resultSearch[i].getText({ name: "custrecord_tk_configuration_sr_record" }),
                    internalid: resultSearch[i].getValue({ name: "internalid" })
                })
            }
        }

        log.debug("getSubsRecDelete", result)
        return result;
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    }
});

