/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 * @NModuleScope Public
*/

define(["N/log", "N/runtime", "./TK - LIB Proceso Automatico.js", "N/ui/serverWidget", "N/redirect", "N/task", "N/record", "N/file", "N/search", "./TK - LIB Email.js"], function (log, runtime, library, serverWidget, redirect, task, record, file, search, libEmail) {

    let currentScript = runtime.getCurrentScript();
    const userRecord = runtime.getCurrentUser();

    const onRequest = (context) => {
        let suitelet = context.request.parameters.suitelet;
        log.debug("context.request.parameters",context.request.parameters )
        log.debug("suitelet",suitelet )
        if(suitelet == null || suitelet == ""){
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
                let nameReport = currentScript.getParameter({ name: "custscript_tk_report_name" });

                let parameters = getParametersWithDefaultValues(context.request.parameters);
                log.debug("parameters", parameters);

                userInterface.createForm(nameReport);
                userInterface.setClientScript("./TK - CL Proceso Automatico.js");

                let suitelet = userInterface.addField("suitelet", serverWidget.FieldType.TEXT, "Tipo Vista: ");
                    suitelet.setDefaultValue("");
                    suitelet.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);

                let conteinerID_1 = "custpage_group_filters";
                    userInterface.addFieldGroup(conteinerID_1, "Filtros");

                let configuration = userInterface.addField("custpage_configuration", serverWidget.FieldType.SELECT, "Configuración: ", conteinerID_1, "customrecord_tk_configuration_general");
                    configuration.setDefaultValue(parameters.configuration);
                    configuration.setMandatoryValue(true);

                userInterface.addButton("custpage_importcsv", "Importar CSV", "importCsv(" + parameters.configuration + ")");
                //userInterface.addButton("custpage_resultimportcsv", "Ver Resultados Importaciones", "resultImportCsv");
                userInterface.addButton("custpage_asignarrolesscripts", "Asignar Roles Scripts", "setRolesScripts(" + parameters.configuration + ")");
                userInterface.addButton("custpage_asignarrolesrecords", "Asignar Roles Records", "setRolesRecords(" + parameters.configuration + ")");
                userInterface.addButton("custpage_asignarsubsidiaries", "Asignar Subsidiarias", "setSubsidiariesRecords(" + parameters.configuration + ")");
                
                let conteinerID_3 = "custpage_group_indice";
                    userInterface.addFieldGroup(conteinerID_3, "Indice");
                
                let pageField = userInterface.addField("custpage_pages", serverWidget.FieldType.SELECT, "Indice de Pagina", conteinerID_3); 

                let resultSubList = userInterface.addSublist("custpage_sublist", serverWidget.SublistType.LIST,"Auditoria");
                    resultSubList.addSublistField("custpage_sublist_objet_name", serverWidget.FieldType.TEXT, "Proceso");
                    resultSubList.addSublistField("custpage_sublist_date", serverWidget.FieldType.TEXT, "ID Fecha");
                    resultSubList.addSublistField("custpage_sublist_roles_subsidiary", serverWidget.FieldType.TEXT, "Objetos Enviados");
                    resultSubList.addSublistField("custpage_sublist_detail", serverWidget.FieldType.TEXT, "Detalle");
                    resultSubList.addSublistField("custpage_sublist_status", serverWidget.FieldType.TEXT, "Resultado");
            
                resultSubList.addRefreshButton();

                let filterDefaultValues = getFilterDefaultValues(false, configuration);
                    filterDefaultValues.page = 0;
                
                userInterface.setAuditoria(resultSubList, filterDefaultValues, pageField);
            

                context.response.writePage(userInterface.FORM);
            } 
        } catch (error) {
            log.error("Error en SL " + FN, error);
        }
    }

    const report = () => { }
    
    report.importCsv = function (context){
        let FN = "SL importCsv";
        try {
            var method = context.request.method;

            let { UserInterface } = library;
            let userInterface = new UserInterface();
            userInterface.init();
            
            if (method == "GET") {
                let nameReport = "Importación CSV";

                let parameters = getParametersWithDefaultValues(context.request.parameters);
                log.debug("parameters", parameters);

                userInterface.createForm(nameReport);
                userInterface.setClientScript("./TK - CL Proceso Automatico.js");
                
                let suitelet = userInterface.addField("suitelet", serverWidget.FieldType.TEXT, "Tipo Vista: ");
                    suitelet.setDefaultValue("importCsv");
                    suitelet.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);

                let configuration = userInterface.addField("custpage_configuration", serverWidget.FieldType.SELECT, "Configuración: ",null, "customrecord_tk_configuration_general");
                    configuration.setDefaultValue(parameters.configuration);
                    configuration.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                
                let conteinerID_3 = "custpage_group_indice";
                userInterface.addFieldGroup(conteinerID_3, "Indice");
               
                let pageField = userInterface.addField("custpage_pages", serverWidget.FieldType.SELECT, "Indice de Pagina", conteinerID_3);
                
                let resultSubList = userInterface.addSublist("custpage_sublist", serverWidget.SublistType.LIST,"Lista de Records");
                    resultSubList.addSublistField("custpage_sublist_objet_name", serverWidget.FieldType.TEXT, "Records");
                    resultSubList.addSublistField("custpage_sublist_check", serverWidget.FieldType.CHECKBOX, "Seleccionar");
                    resultSubList.addSublistField("custpage_sublist_objet_id", serverWidget.FieldType.TEXT, "ID Record").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_fielcsv", serverWidget.FieldType.TEXT, "File Csv").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_nivel", serverWidget.FieldType.TEXT, "Nivel").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_importid", serverWidget.FieldType.TEXT, "Import ID").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_aux", serverWidget.FieldType.TEXT, "ID Records").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                
                    resultSubList.addMarkAllButtons();

                let filterDefaultValues = getFilterDefaultValues(false, configuration);
                    filterDefaultValues.page = 0;
                
                log.debug("filterDefaultValues", filterDefaultValues);
                
                userInterface.setResultSubListData(resultSubList, filterDefaultValues, pageField);

                userInterface.addSubmitButton("Procesar");
                userInterface.addButton("custpage_volver", "Volver", "volver(" + parameters.configuration + ")");
                
                context.response.writePage(userInterface.FORM);
            } else if (method == "POST") {
                let infoRecords = getResultSublistData(context.request.parameters.custpage_sublistdata);
            

                let jsonResult = {
                    infoRecords: infoRecords,
                    parent: context.request.parameters.custpage_configuration
                }

                var folderID = getFolder(),
                    a = getFile(jsonResult, folderID)

                submitMapReduceTask(a,"customscript_tk_ss_process_automatic", "customdeploy_tk_ss_process_automatic");

                redirect.toSuitelet({
                    scriptId: "customscript_tk_process_automatic",
                    deploymentId: "customdeploy_tk_process_automatic",
                    parameters: {
                        "suitelet": "",
                        "configuration" : context.request.parameters.custpage_configuration
                       
                    }
                });
            }
        } catch (error) {
            log.error("Error en SL " + FN, error);
        }
    }

    report.resultImportCsv = function (context){
        let FN = "SL resultImportCsv";
        try{
            var method = context.request.method;
            
            let { UserInterface } = library;
            let userInterface = new UserInterface();
            userInterface.init();

            if (method == "GET") {
                let nameReport = "Resultados de Importaciones";

                let parameters = getParametersWithDefaultValues(context.request.parameters);
                log.debug("parameters", parameters);

                userInterface.createForm(nameReport);
                userInterface.setClientScript("./TK - CL Proceso Automatico.js");

                let conteinerID_1 = "custpage_group_filters";
                userInterface.addFieldGroup(conteinerID_1, "Filtros");
                
                let pageField = userInterface.addField("custpage_pages", serverWidget.FieldType.SELECT, "Indice de Pagina", conteinerID_1);
                
                let resultSubList = userInterface.addSublist("custpage_sublist", serverWidget.SublistType.LIST,"Lista de Importanciones");
                    resultSubList.addSublistField("custpage_sublist_objet_name", serverWidget.FieldType.TEXT, "Records");
                    resultSubList.addSublistField("custpage_sublist_record_status", serverWidget.FieldType.TEXT, "Estado");
                    resultSubList.addSublistField("custpage_sublist_check", serverWidget.FieldType.CHECKBOX, "Seleccionar").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_objet_id", serverWidget.FieldType.TEXT, "ID Record").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_fielcsv", serverWidget.FieldType.TEXT, "File Csv").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_nivel", serverWidget.FieldType.TEXT, "Nivel").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_importid", serverWidget.FieldType.TEXT, "Import ID").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_aux", serverWidget.FieldType.TEXT, "ID Records").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
            
                    //resultSubList.addMarkAllButtons();
                    resultSubList.addRefreshButton();

                let filterDefaultValues = {
                    page: 0
                };
                log.debug("filterDefaultValues", filterDefaultValues);
                
                let searchCustom = search.create({
                    type: "file",
                    columns: ["internalid"],
                    filters: ["name", "is", "informaccionImports.txt"]
                });

                objResult = searchCustom.run().getRange(0, 50);

                if (objResult == "" || objResult == null) {
                    // Colocar mensaje de alerta
                } else {
                    var fileID = objResult[0].getValue("internalid");
                }
                log.debug("fileID", fileID)
                var fileLoad = file.load({
                    id: fileID
                });
                let arrImports = JSON.parse(fileLoad.getContents());
                log.debug("arrImports", arrImports)
                
                for (let l = 0; l < arrImports.length; l++) {
                    let element = arrImports[l];

                    var myTaskStatus = task.checkStatus({
                        taskId: element.csvID
                    });
                    log.audit("myTaskStatus", myTaskStatus); 

                    resultSubList.setSublistValue("custpage_sublist_objet_name", l, element.recordName);
                    resultSubList.setSublistValue("custpage_sublist_record_status", l, myTaskStatus.status);
                        
                }

                userInterface.addButton("custpage_volver", "Volver", "volver(" + parameters.configuration + ")");

                context.response.writePage(userInterface.FORM);
            }
        }catch(e){
            log.error("Error en SL " + FN, error);
        }
    }

    report.setRolesScripts = function (context){
        let FN = "SL setRolesScripts";
        try {
            var method = context.request.method;
            let { UserInterface } = library;
            let userInterface = new UserInterface();
            userInterface.init();

            if (method == "GET") {
                let nameReport = "Asignar Roles en Scripts";

                let parameters = getParametersWithDefaultValues(context.request.parameters);
                log.debug("parameters", parameters);

                userInterface.createForm(nameReport);
                userInterface.setClientScript("./TK - CL Proceso Automatico.js");

                let conteinerID_1 = "custpage_group_filters";
                userInterface.addFieldGroup(conteinerID_1, "Filtros");

                let typeScript = userInterface.addField("custpage_type_script", serverWidget.FieldType.MULTISELECT, "Tipo Script: ", conteinerID_1);
                let aux = (parameters.typeScript).split(",");    
                    typeScript.setDefaultValue(aux);

                    typeScript.addSelectOption("CLIENT","Client");
                    typeScript.addSelectOption("SCRIPTLET","Suitelet");
                    typeScript.addSelectOption("USEREVENT","User Event");
                
                let suitelet = userInterface.addField("suitelet", serverWidget.FieldType.TEXT, "Tipo Vista: ", conteinerID_1);
                    suitelet.setDefaultValue("setRolesScripts");
                    suitelet.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);

                let configuration = userInterface.addField("custpage_configuration", serverWidget.FieldType.SELECT, "Configuración: ",null, "customrecord_tk_configuration_general");
                    configuration.setDefaultValue(parameters.configuration);
                    configuration.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);

                var valuesConfi = getValuesConfiguration(parameters.configuration);

                log.debug("valuesConfi", valuesConfi)

                let conteinerID_2 = "custpage_group_roles";
                    userInterface.addFieldGroup(conteinerID_2, "Roles");
                
                let getRoles = userInterface.addField("custpage_roles", serverWidget.FieldType.MULTISELECT, "Roles", conteinerID_2, "role");
                    getRoles.setDefaultValue(valuesConfi.Roles);
                    getRoles.setMandatoryValue(true);

                let conteinerID_3 = "custpage_group_indice";
                    userInterface.addFieldGroup(conteinerID_3, "Indice");

                let pageField = userInterface.addField("custpage_pages", serverWidget.FieldType.SELECT, "Indice de Pagina", conteinerID_3);
                 
                let strhtml = "<html>";
                strhtml += "<table border=\"0\" class=\"table_fields\" cellspacing=\"0\" cellpadding=\"0\">" +
                    "<tr>" +
                    "</tr>" +
                    "<tr>" +
                    "<td class=\"text\">" +
                    "<div style=\"color: gray; font-size: 9pt; margin-top: 10px; padding: 5px; border-top: 1pt solid silver\">Se le asiganara los roles seleccionados a todos los deploy de los scripts enviados. </br> Para los script tipo Suitelet se le configurara todos los roles.</div>" +
                    "</td>" +
                    "</tr>" +
                    "</table>" +
                    "</html>";
    
                var varInlineHtml = userInterface.addField("custpage_strhtml", serverWidget.FieldType.INLINEHTML, "message");
                    varInlineHtml.updateLayoutType(serverWidget.FieldLayoutType.OUTSIDEBELOW);
                    varInlineHtml.setDefaultValue(strhtml);

                let resultSubList = userInterface.addSublist("custpage_sublist", serverWidget.SublistType.LIST,"Lista de Scripts");
                    resultSubList.addSublistField("custpage_sublist_objet_name", serverWidget.FieldType.TEXT, "Scripts");
                    resultSubList.addSublistField("custpage_sublist_check", serverWidget.FieldType.CHECKBOX, "Seleccionar");
                    resultSubList.addSublistField("custpage_sublist_objet_id", serverWidget.FieldType.TEXT, "ID Script").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_script_type", serverWidget.FieldType.TEXT, "ID Script").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_aux", serverWidget.FieldType.TEXT, "ID").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                
                    resultSubList.addMarkAllButtons();

                let filterDefaultValues = getFilterDefaultValues(typeScript, configuration);
                    filterDefaultValues.page = 0;
                
                userInterface.setResultSubListScripts(resultSubList, filterDefaultValues, pageField);
                
                userInterface.addSubmitButton("Asignar Roles");
                userInterface.addButton("custpage_volver", "Volver", "volver(" + parameters.configuration + ")");

                context.response.writePage(userInterface.FORM);
            } else if (method == "POST") {
                let infoRecords = getResultSublistData(context.request.parameters.custpage_sublistdata);

                let jsonResult = {
                    infoRecords: infoRecords,
                    roles: context.request.parameters.custpage_roles,
                    parent: context.request.parameters.custpage_configuration,
                }

                var folderID = getFolder(),
                a = getFile(jsonResult, folderID);

                submitMapReduceTask(a,"customscript_tk_ss_process_scripts", "customdeploy_tk_ss_process_scripts");

                redirect.toSuitelet({
                    scriptId: "customscript_tk_process_automatic",
                    deploymentId: "customdeploy_tk_process_automatic",
                    parameters: {
                        "suitelet": "",
                        "configuration" : context.request.parameters.custpage_configuration
                       
                    }
                });
            }
        } catch (error) {
            log.error("Error en SL " + FN, error);
        }
    }

    report.setRolesRecords = function (context){
        let FN = "SL setRolesRecords";
        try {
            var method = context.request.method;
            let { UserInterface } = library;
            let userInterface = new UserInterface();
            userInterface.init();
            if (method == "GET") {
                let nameReport = "Asignar Roles Records";

                let parameters = getParametersWithDefaultValues(context.request.parameters);
                log.debug("parameters", parameters);

                userInterface.createForm(nameReport);
                userInterface.setClientScript("./TK - CL Proceso Automatico.js");

                let conteinerID_1 = "custpage_group_filters";
                userInterface.addFieldGroup(conteinerID_1, "Filtros");
                
                let suitelet = userInterface.addField("suitelet", serverWidget.FieldType.TEXT, "Tipo Vista: ", conteinerID_1);
                    suitelet.setDefaultValue("setRolesRecords");
                    suitelet.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);

                let configuration = userInterface.addField("custpage_configuration", serverWidget.FieldType.SELECT, "Configuración: ",null, "customrecord_tk_configuration_general");
                    configuration.setDefaultValue(parameters.configuration);
                    configuration.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);

                var valuesConfi = getValuesConfiguration(parameters.configuration);
                log.debug("valuesConfi", valuesConfi)

                let conteinerID_2 = "custpage_group_roles";
                userInterface.addFieldGroup(conteinerID_2, "Roles");
                
                let getRoles = userInterface.addField("custpage_roles", serverWidget.FieldType.MULTISELECT, "Roles", conteinerID_2, "role");
                    getRoles.setDefaultValue(valuesConfi.Roles);
                    getRoles.setMandatoryValue(true);

                let nivel = userInterface.addField("custpage_nivel", serverWidget.FieldType.SELECT, "Nivel: ", conteinerID_2);
                    nivel.addSelectOption(0,"Ninguno");
                    nivel.addSelectOption(1,"Vista");
                    nivel.addSelectOption(2,"Creación");
                    nivel.addSelectOption(3,"Edición");
                    nivel.addSelectOption(4,"Todo");
                    nivel.setDefaultValue(1);
                
                let conteinerID_3 = "custpage_group_indice";
                userInterface.addFieldGroup(conteinerID_3, "Indice");

                let pageField = userInterface.addField("custpage_pages", serverWidget.FieldType.SELECT, "Indice de Pagina", conteinerID_3);
               
                let resultSubList = userInterface.addSublist("custpage_sublist", serverWidget.SublistType.LIST,"Lista de Records");
                    resultSubList.addSublistField("custpage_sublist_objet_name", serverWidget.FieldType.TEXT, "Records");
                    resultSubList.addSublistField("custpage_sublist_check", serverWidget.FieldType.CHECKBOX, "Seleccionar");
                    resultSubList.addSublistField("custpage_sublist_permissions", serverWidget.FieldType.CHECKBOX, "Mantener Permisos");
                    resultSubList.addSublistField("custpage_sublist_objet_id", serverWidget.FieldType.TEXT, "ID Records").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_aux", serverWidget.FieldType.TEXT, "ID").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                
                    resultSubList.addMarkAllButtons();

                let filterDefaultValues = getFilterDefaultValues(false, configuration);
                    filterDefaultValues.page = 0;
                
                log.debug("filterDefaultValues", filterDefaultValues);
                userInterface.setResultSubListRecords(resultSubList, filterDefaultValues, pageField);
                
                userInterface.addSubmitButton("Asignar Roles");
                userInterface.addButton("custpage_volver", "Volver", "volver(" + parameters.configuration + ")");

                context.response.writePage(userInterface.FORM);
            } else if (method == "POST") {
                let infoRecords = getResultSublistData(context.request.parameters.custpage_sublistdata);
                var breakLine = /\u0005/, a = "";
                let arrRol = (context.request.parameters.custpage_roles).split(breakLine);
                log.debug("arrRol",arrRol)
                if(arrRol.length != 0){
                    arrRol.forEach(element => {
                        a += element + ",";
                    });
                    let b = a.length;
                    a = a.substring(0, b-1)
                }


                let jsonResult = {
                    infoRecords: infoRecords,
                    roles: a,
                    nivel: context.request.parameters.custpage_nivel,
                    parent: context.request.parameters.custpage_configuration,
                }

                var folderID = getFolder(),
                a = getFile(jsonResult, folderID);
            
                submitMapReduceTask(a,"customscript_tk_ss_process_records", "customdeploy_tk_ss_process_records");

                redirect.toSuitelet({
                    scriptId: "customscript_tk_process_automatic",
                    deploymentId: "customdeploy_tk_process_automatic",
                    parameters: {
                        "suitelet": "",
                        "configuration" : context.request.parameters.custpage_configuration
                       
                    }
                });
            }
        } catch (error) {
            log.error("error", error);
        }
    }

    report.setSubsidiariesRecords = function (context){
        let FN = "SL setSubsidiariesRecords";
        try {
            var method = context.request.method,
                { UserInterface } = library,
                { sendEmail } = libEmail,
                author = runtime.getCurrentUser();

            let userInterface = new UserInterface();
            userInterface.init();

            let sendemail = new sendEmail();
            sendemail.init();
            if (method == "GET") {
                let nameReport = "Asignar Subsidiarias en Records";

                let parameters = getParametersWithDefaultValues(context.request.parameters);
                log.debug("parameters", parameters);

                userInterface.createForm(nameReport);
                userInterface.setClientScript("./TK - CL Proceso Automatico.js");

                let conteinerID_1 = "custpage_group_filters";
                userInterface.addFieldGroup(conteinerID_1, "Filtros");

                let suitelet = userInterface.addField("suitelet", serverWidget.FieldType.TEXT, "Tipo Vista: ", conteinerID_1);
                    suitelet.setDefaultValue("setSubsidiariesRecords");
                    suitelet.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);

                let configuration = userInterface.addField("custpage_configuration", serverWidget.FieldType.SELECT, "Configuración: ",null, "customrecord_tk_configuration_general");
                    configuration.setDefaultValue(parameters.configuration);
                    configuration.updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                
                var valuesConfi = getValuesConfiguration(parameters.configuration);
                log.debug("valuesConfi", valuesConfi)

                let conteinerID_2 = "custpage_group_subsidiaries";
                userInterface.addFieldGroup(conteinerID_2, "Subsidiarias");
                
                let getSubs = userInterface.addField("custpage_subsidiary", serverWidget.FieldType.MULTISELECT, "Subsidiarias: ", conteinerID_2, "subsidiary");
                    getSubs.setDefaultValue(valuesConfi.Subsidiaries);
                    getSubs.setMandatoryValue(true);

                let conteinerID_3 = "custpage_group_indice";
                userInterface.addFieldGroup(conteinerID_3, "Indice");

                let pageField = userInterface.addField("custpage_pages", serverWidget.FieldType.SELECT, "Indice de Pagina", conteinerID_3);
                
                let resultSubList = userInterface.addSublist("custpage_sublist", serverWidget.SublistType.LIST,"Lista de Records");
                    resultSubList.addSublistField("custpage_sublist_objet_name", serverWidget.FieldType.TEXT, "Record");
                    resultSubList.addSublistField("custpage_sublist_check", serverWidget.FieldType.CHECKBOX, "Seleccionar");
                    resultSubList.addSublistField("custpage_sublist_objet_id", serverWidget.FieldType.TEXT, "ID Record").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_scriptid", serverWidget.FieldType.TEXT, "ID").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_field", serverWidget.FieldType.TEXT, "ID").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                    resultSubList.addSublistField("custpage_sublist_aux", serverWidget.FieldType.TEXT, "ID").updateDisplayType(serverWidget.FieldDisplayType.HIDDEN);
                
                    resultSubList.addMarkAllButtons();

                let filterDefaultValues = getFilterDefaultValues(false, configuration);
                    filterDefaultValues.page = 0;
                
                log.debug("filterDefaultValues", filterDefaultValues);
                userInterface.setResultSubListSubRecord(resultSubList, filterDefaultValues, pageField);
                
                userInterface.addSubmitButton("Asignar Subsidiarias");
                userInterface.addButton("custpage_volver", "Volver", "volver(" + parameters.configuration + ")");

                context.response.writePage(userInterface.FORM);
            } else if (method == "POST") {
                let infoRecords = getResultSublistData(context.request.parameters.custpage_sublistdata);
                // col1 -> Record Name, col2 -> Record ID, col3 -> Record Netsuite ID, col4 -> Field
                
                let jsonResult = {
                    infoRecords: infoRecords,
                    subs: context.request.parameters.custpage_subsidiary,
                    parent: context.request.parameters.custpage_configuration,
                }

                var folderID = getFolder(),
                a = getFile(jsonResult, folderID);

                submitMapReduceTask(a,"customscript_tk_ss_process_subs_regs", "customdeploy_tk_ss_process_subs_regs");

                redirect.toSuitelet({
                    scriptId: "customscript_tk_process_automatic",
                    deploymentId: "customdeploy_tk_process_automatic",
                    parameters: {
                        "suitelet": "",
                        "configuration" : context.request.parameters.custpage_configuration
                    }
                });
            }
        } catch (error) {
            log.error("Error en SL " + FN, error);
        }
    }

    const setSubsidiaries = (element, paramSub) => {
        var body = "";
        let customSearch = search.create({
            type: element.col3,
            filters: [
                ["isinactive", "is", "F"]
            ],
            columns: [
                search.createColumn({name: "internalid", label: "Internal ID"})
            ]
        });
        
        var pagedData = customSearch.runPaged({ pageSize: 1000 });
        pagedData.pageRanges.forEach(function (pageRange) {
            page = pagedData.fetch({
                index: pageRange.index
            });
            page.data.forEach(function (result) {
                try {
                    let register = result.getValue("internalid");

                    let obj = record.load({ type: element.col3, id: register, isDynamic: true });
                    obj.setValue(element.col4, paramSub);
                    obj.save();
                } catch (error) {
                    body +=  "<p>La actualización del campo subsidiaria del record " + element.col1 + "  para el registro " + register + " fallo.</p>";
                }
            });
        });

        return body; 
    }

    const submitMapReduceTask = (paramRecords, script, deploy) => {
        let params = {
            custscript_tk_ss_process_automatic_input: paramRecords,
            custscript_tk_ss_process_scripts_input: paramRecords,
            custscript_tk_ss_process_records_input: paramRecords,
            custscript_tk_ss_process_subs_regs_input: paramRecords
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

    const getFilterDefaultValues = (typeScript, configuration) => {
        var result2 = "",  result3 = "";
        
        if(typeScript) result2 = typeScript.getDefaultValue();
        if(configuration) result3 = configuration.getDefaultValue();

        return {
            typeScript: result2,
            configuration: result3
        };
    }

    const getValuesConfiguration = (configuration) => {
           
        var arrayRol = [], arraySub = [];
        var fieldLookUp = search.lookupFields({
            type: "customrecord_tk_configuration_general",
            id: configuration,
            columns: ["custrecord_tk_configuration_general_sub", "custrecord_tk_configuration_general_rol"]
        });

        log.debug( " fieldLookUp ",fieldLookUp)
        let arrSub = fieldLookUp.custrecord_tk_configuration_general_sub,
            arrRol = fieldLookUp.custrecord_tk_configuration_general_rol;

        if(arrRol.length != 0){
            arrRol.forEach(element => {
                arrayRol.push(element.value);
            });
        }

        if(arrSub.length != 0){
            arrSub.forEach(element => {
                arraySub.push(element.value);
            });
        }

        return {
            Subsidiaries: arraySub,
            Roles: arrayRol
        };
    }

    const getResultSublistData = (sublistData) => {
        let resultData = [];
        log.debug("entro a la funcion", sublistData)
        try {
            const breakLine = /\u0002/;
            const breakColumns = /\u0001/;

            let lines = sublistData.split(breakLine);
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].split(breakColumns);
                if (line[1] == "T") {
                    resultData.push({
                        col1  : line[0] || "",
                        col2  : line[2] || "",
                        col3  : line[3] || "",
                        col4  : line[4] || "",
                        col5  : line[5] || "",
                        col6  : line[6] || ""
                    });
                }
            }
        } catch (error) {
            log.error("An error was found in [getSublistData] function", error);
        }

        return resultData;
    }

    const getFolder = () => {
        let searchCustom = search.create({
            type: "folder",
            columns: ["internalid"],
            filters: ["name", "is", "FolderAutomatico"]
        });

        objResult = searchCustom.run().getRange(0, 50);
        if (objResult == "" || objResult == null) {
            let newFolder = record.create({
                type: "folder"
            });

            newFolder.setValue("name", "FolderAutomatico");
            var foldeID = newFolder.save();
        } else {
            var foldeID = objResult[0].getValue("internalid");
        }

        return foldeID;
    }
    
    const getFile = (rptJson, folderID) => {
        let searchCustomFile = search.create({
            type: "file",
            columns: ["internalid"],
            filters: ["name", "is", "automaticInformation.txt"]
        });

        objResult = searchCustomFile.run().getRange(0, 50);

        if (objResult == "" || objResult == null) {
            // Colocar mensaje de alerta
        } else {
            var fileID = objResult[0].getValue("internalid");
            log.debug("Encontrado fileID", fileID);

            file.delete({
                id: fileID
            });
        }

        fileObj = file.create({
            name: "automaticInformation.txt",
            fileType: file.Type.PLAINTEXT,
            contents: JSON.stringify(rptJson),
            folder: folderID
        });

        // Save the file
        let txt = fileObj.save();
        log.debug("ID TXT", txt);

        return txt;
    }

    return {
        onRequest
    }
})