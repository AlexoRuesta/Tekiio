/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 * @NModuleScope Public
*/

define(["N/log", "N/runtime", "./TK - LIB Proceso Automatico.js", "N/ui/serverWidget", "N/redirect", "N/task", "N/record", "N/file", "N/search"], function (log, runtime, library, serverWidget, redirect, task, record, file, search) {

    let currentScript = runtime.getCurrentScript();
    const userRecord = runtime.getCurrentUser();

    const onRequest = (context) => {
        let suitelet = context.request.parameters.suitelet;
        log.debug("context.request.parameters",context.request.parameters )
        log.debug("suitelet",suitelet )
        if(suitelet == null || suitelet == "Proceso RED"){
            main(context)
        }else{
            report[suitelet](context)
        }
    }

    const main = (context) => {
        try {
            var method = context.request.method,
                FN = "main"; 

            let { UserInterface } = library;
            let userInterface = new UserInterface();
                userInterface.init();

            if (method == "GET") {
                let nameReport = "Seleccionar Proceso";

                let parameters = getParametersWithDefaultValues(context.request.parameters);
                log.debug("parameters", parameters);

                userInterface.createForm(nameReport);
                userInterface.setClientScript("./TK - CL Proceso Automatico.js");

                let suitelet = userInterface.addField("suitelet", serverWidget.FieldType.TEXT, "Tipo Vista: ");
                    suitelet.setDefaultValue("Proceso RED");
                    suitelet.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);

                let conteinerID_1 = "custpage_group_filters";
                    userInterface.addFieldGroup(conteinerID_1, "Filtros");

                let country = userInterface.addField("custpage_country", serverWidget.FieldType.SELECT, "Pais: ", conteinerID_1, -159);
                    country.setMandatoryValue(true);

                userInterface.addSubmitButton("Implementación Automática");
                userInterface.addButton("custpage_purpura", "Implementación Manual", "setPurpura");

                context.response.writePage(userInterface.FORM);
            } else{
                log.debug("country", context.request.parameters.custpage_country);
                var jsonInformation = getInformation(context.request.parameters.custpage_country)
                log.debug("jsonInformation",jsonInformation);

                let arrSubs = getArrValues("subsidiary", jsonInformation.tag);
                log.debug("arrSubs",arrSubs);

                let arrRoles = getArrValues("role", null, arrSubs)
                log.debug("arrRoles",arrRoles);

                if(arrSubs != null || arrRoles != null){
                    var a = createConfiguration(jsonInformation.custom, arrSubs, arrRoles, context.request.parameters.custpage_country);
                   
                    let jsonResult = {
                        parent: a,
                        proceso: "RED"
                    }
    
                    submitMapReduceTask(jsonResult,"customscript_tk_ss_selected_process", "customdeploy_tk_ss_selected_process");
    
                }
               
                redirect.toSuitelet({
                    scriptId: "customscript_tk_sl_selected_process",
                    deploymentId: "customdeploy_tk_sl_selected_process",
                    parameters: {
                        "suitelet": "Proceso RED"
                       
                    }
                });
            }
        } catch (error) {
            log.error("Error en SL " + FN, error);
        }
    }

    const getInformation = (country) => {
        var json = {};

        var customSearch = search.create({
            type: "customrecord_tk_additional_information",
            filters:[
               ["custrecord_tk_additional_information_cou","anyof", country]
            ],
            columns:[
               search.createColumn({name: "custrecord_tk_additional_information_jso", label: "JSON"})
            ]
         });

        let resultCount = customSearch.runPaged().count;

        if (resultCount != 0) {
            let result = customSearch.run().getRange({ start: 0, end: 1 });
            json = JSON.parse(result[0].getValue(customSearch.columns[0]));

        } else {
            log.error("No cuenta con un registro en el record TK - Información Adicional con el mismo país");
            return false;
        }
     
        log.debug("json",json)
        return json;
     }

    const getArrValues = (searchType, country = null, subs = null) => {
        var arrResult = [];

        let customSearch = search.create({
            type: searchType,
            filters: [
                ["isinactive", "is", "F"]
            ],
            columns: [
                search.createColumn({name: "internalid", label: "Internal ID"})
            ]
        });

        if (country) {
            log.debug("country",country)
            customSearch.filters.push(
                search.createFilter({
                    name: "country",
                    operator: search.Operator.ANYOF,
                    values: country,
                })
            );
        }

        if (subs) {
            customSearch.filters.push(
                search.createFilter({
                    name: "subsidiaries",
                    operator: search.Operator.IS,
                    values: subs,
                })
            );

            customSearch.filters.push(
                search.createFilter({
                    name: "internalid",
                    operator: search.Operator.NONEOF,
                    values: 3,
                })
            );
        }
        let resultSearch = customSearch.run().getRange(0, 1000);
        log.debug("resultSearch.length",resultSearch.length)
        
        if (resultSearch.length != 0) {
            for (var i in resultSearch) {
                arrResult.push(resultSearch[i].getText({ name: "internalid" }))
            }
        }else{
            arrResult = null;
            log.debug("no se encontraron resultado", searchType)
        }

        return arrResult; 
    }

    const createConfiguration = (paramName, paramSubs, paramRoles, paramCountry) => {
        var objRecord = record.create({
            type: "customrecord_tk_configuration_general",
            isDynamic: true
        });

        objRecord.setValue({
            fieldId: "name",
            value: paramName
        });
        
        objRecord.setValue({
            fieldId: "custrecord_tk_configuration_general_cou",
            value: paramCountry
        });

        objRecord.setValue({
            fieldId: "custrecord_tk_configuration_general_sub",
            value: paramSubs
        });

        objRecord.setValue({
            fieldId: "custrecord_tk_configuration_general_rol",
            value: paramRoles
        });

        objRecord.setValue({
            fieldId: "custrecord_tk_configuration_general_chec",
            value: true
        });

        objRecord.setValue({
            fieldId: "custrecord_tk_configuration_general_stat",
            value: true
        });
        
        let obj = objRecord.save();

        return obj;
    }

    const submitMapReduceTask = (paramRecords, script, deploy) => {
        let params = {
            custscript_tk_ss_select_process_input: JSON.stringify(paramRecords)
        }

        log.debug("params", JSON.stringify(params));

        let scriptTask = task.create({
            taskType: task.TaskType.SCHEDULED_SCRIPT,
            scriptId: script,
            deploymentId: deploy,
            params
        });
        let scriptTaskId = scriptTask.submit();
    }

    const getParametersWithDefaultValues = (parameters) => {
        return {
            country: parameters.country || "",
            typeScript: parameters.typeScript || "",
            suitelet: parameters.suitelet || "",
            configuration: parameters.configuration || ""
        }
    }

    return {
        onRequest
    }
})