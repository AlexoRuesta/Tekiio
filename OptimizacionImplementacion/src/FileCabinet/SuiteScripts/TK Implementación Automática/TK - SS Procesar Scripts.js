/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 *
 */
define(["N/task", "N/runtime", "N/file", "N/search", "N/record", "./TK - LIB Email.js", "./TK - LIB Proceso Automatico.js"], (task, runtime, file, search, record, library, libAuditoria) => {

    const execute = (context) => {
        const nameProcess = "Asignar Roles en Scripts";
        // col1 -> Script Name, col2 -> Script ID, col3 -> Script Type, col4 -> internalID

        
        var FN = "Procesar Scripts",
            author = runtime.getCurrentUser(),
            { sendEmail } = library,
            { Auditoria } = libAuditoria,
            sendemail = new sendEmail();
            sendemail.init();

            audit = new Auditoria();
            audit.init();
        try {
            let fileID = runtime.getCurrentScript().getParameter({ name: "custscript_tk_ss_process_scripts_input" }),
                jsonTransaction = file.load({id: fileID}).getContents(),
                arrayData = JSON.parse(jsonTransaction),
                arrayInput = arrayData.infoRecords,
                arrayRoles = (arrayData.roles).split(","),
                parent = arrayData.parent,
                arrAux  = [],
                rptJson = [],
                body    = "";

            log.debug("información Input", arrayInput);
            for (let l = 0; l < arrayInput.length; l++) {
                let objArr  = arrayInput[l];
        
                arrAux.push(objArr.col2);
            }
            log.debug("arrAux", arrAux);

            let customSearch = search.load({ id: "customsearch_tk_search_deployments" });
            
            let filterOne = search.createFilter({ join: "script", name: "internalid", operator: search.Operator.ANYOF, values: arrAux });
            customSearch.filters.push(filterOne);
            
            var pagedData = customSearch.runPaged({ pageSize: 1000 });

            pagedData.pageRanges.forEach(function (pageRange) {
                page = pagedData.fetch({
                    index: pageRange.index
                });
                page.data.forEach(function (result) {
                    let col1 = result.getValue(result.columns[0]);
                    let col2 = result.getValue(result.columns[1]);
                    let col3 = result.getValue(result.columns[2]);
                    let col4 = result.getValue(result.columns[3]);
                    rptJson.push({
                        scriptid: col1,
                        deployid: col2,
                        scriptTp: col3,
                        scriptName: col4
                    })
                });
            });

            log.debug(FN, "response: " + JSON.stringify(rptJson));
            log.debug("información Roles", arrayRoles);

            var arrCOMPLETE = [], arrFAILED = [];

            for (let i = 0; i < rptJson.length; i++) {
                let element = rptJson[i];
                log.debug("element", element)
                try {
                    var objRecord = record.load({
                        type: record.Type.SCRIPT_DEPLOYMENT, 
                        id: element.deployid
                    });
                    if(element.scriptTp == "SCRIPTLET"){
                        objRecord.setValue("allroles",true);
                    }else{
                        objRecord.setValue("allroles",false);
                        objRecord.setValue("audslctrole",arrayRoles);
                    }

                    objRecord.save();
                    arrCOMPLETE.push(element.scriptName);
                } catch (error) {
                    body +=  "<p>Ocurrio un error al editar el deploy con ID " + element.deployid + ".</p>";
                    arrFAILED.push(element.scriptName);
                }
            }

            arrCOMPLETE = [...new Set(arrCOMPLETE)];
            arrFAILED = [...new Set(arrFAILED)];
            
            var date = audit.getDate();
            
            if(arrCOMPLETE.length != 0){
                arrCOMPLETE.forEach(element => {
                    audit.setAudit(date, nameProcess, "Se asignaron correctamente los roles al script " + element, "COMPLETO", parent, arrayRoles);
                });
            }

            if(arrFAILED.length != 0){
                audit.setAudit(date, nameProcess, "La asignación de roles al script " + element + "fallo.", "ERROR", parent, arrayRoles)
            }

            if(body != ""){
                sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, false, false, body));
            }else{
                sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyComplete(nameProcess, false, true));
            } 

            log.debug("Finalizo el proceso " + FN)
        } catch (error) {
            log.error("Error en SS " + FN, error);
            sendemail.email(author.id, author.id, nameProcess, sendemail.getMessageBodyCatch(nameProcess, error));
        }
        
    }


    return {
        execute: execute,
    };
});

