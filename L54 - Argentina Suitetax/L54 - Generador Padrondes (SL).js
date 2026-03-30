/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NAmdConfig /SuiteScripts/L54 - configuration.json
 * @NModuleScope Public
 */

define(['N/log', 'LIB - Form', 'LIB - Search', 'N/redirect', 'N/record', 'N/task', 'N/runtime'], 
function(log, libForm, libSearch, redirect, record, task, runtime) {

    let { InitSearch } = libSearch;
        InitSearch = new InitSearch();
        
    let { UserInterface } = libForm;
        UserInterface = new UserInterface();

    const onRequest = (context) => {
        let suitelet = context.request.parameters.suitelet;
        log.debug('context.request.parameters',context.request.parameters )
        log.debug('suitelet',suitelet )
        if(suitelet == null || suitelet == ''){
            main(context)
        }else{
            report[suitelet](context)
        }
    }

    const main = (context) => {
        try {
            var method = context.request.method;

            if (method == 'GET') {
                let nameReport = 'AR - Proceso de Carga de Padrones';

                UserInterface.createForm(nameReport);
                UserInterface.setClientScript('./L54 - Generador Padrondes (CL).js');

                let assetType = UserInterface.addField('custpage_tipo_padron', 'select', 'Seleccione el Tipo de Padron: ').setMandatory(true);
                let suitelet = UserInterface.addField('suitelet', 'text', 'Tipo Vista: ');
                
                suitelet.setDefaultValue('');
                suitelet.updateDisplayType('HIDDEN');
                    
                assetType.addSelectOption( 0,'--- Seleccione ---');
                assetType.addSelectOption( 1,'Padrón RG 2681');
                assetType.addSelectOption( 2,'Padrón RG 830');
                assetType.addSelectOption( 3,'Ingresos Brutos');
                assetType.addSelectOption( 4,'Padrones Aprocifos');
                assetType.addSelectOption( 5,'Padrones SIRCIP');;
                assetType.addSelectOption( 6,'Padrones Embargo');

                const status = context.request.parameters.status;
                const message = context.request.parameters.message;
                
                if (status === 'OK') {
                    UserInterface.addPageInitMessage('El proceso inicio correctamente, se le enviara un correo al finalizar.', 'CONFIRMATION');
                }else if (status === 'ERROR'){
                    UserInterface.addPageInitMessage(message, 'ERROR');
                }
                
                context.response.writePage(UserInterface.FORM);
            } 
        } catch (error) {
            log.error('Error en el MAIN ', error);
        }
    }

    const report = () => { }
    
    report.RG2681 = function (context){
        try {
            var method = context.request.method;
            
            if (method == 'GET') {
                let nameReport = 'AR - Proceso de Carga de Padrones';

                UserInterface.createForm(nameReport);
                UserInterface.setClientScript('./L54 - Generador Padrondes (CL).js');
                
                let suitelet = UserInterface.addField('suitelet', 'text', 'Tipo Vista: ');
                               UserInterface.addField('custpage_file', 'file', 'Seleccionar Archivo: ').setMandatory(true);
            
                suitelet.setDefaultValue('RG2681');
                suitelet.updateDisplayType('HIDDEN');

                UserInterface.addSubmitButton('Procesar Padrones');
                UserInterface.addButton('custpage_volver', 'Volver', 'volver()');

                context.response.writePage(UserInterface.FORM);
            } else if (method == 'POST') {
                let folderID = getFolder('FolderPadrones'),
                    request = context.request,
                    uploadedFile = request.files.custpage_file,
                    MAX_SIZE = 10 * 1024 * 1024;
            
                if (!uploadedFile) {
                    throw new Error('No se seleccionó ningún archivo');
                }
                
                uploadedFile.folder = folderID
                uploadedFile.name = 'padronRG2681_' + new Date().toJSON() + '.txt'
                
                log.debug('INFORMACION', JSON.stringify(uploadedFile))
                
                let archivoID = uploadedFile.save();

                log.debug('archivoID', archivoID);

                let jsonResult = {
                    archivo: archivoID,
                    user: runtime.getCurrentUser().id,
                    fileName: uploadedFile.name
                }

                let params = {
                    custscript_l54_pad_rg2681_mr_input: JSON.stringify(jsonResult)
                }

                submitMapReduceTask(jsonResult, params,'customscript_l54_pad_rg2681_mr', 'customdeploy_l54_pad_rg2681_mr');

                redirect.toSuitelet({
                    scriptId: 'customscript_l54_gen_padron_sl',
                    deploymentId: 'customdeploy_l54_gen_padron_sl',
                    parameters: {
                        'suitelet': '',
                        'status' : 'OK'
                    }
                });
            }
        } catch (error) {
            let mensaje = 'Ocurrio un error - Detalles: ' + error.message
            log.error('Error en report.RG2681 ', mensaje);
            redirect.toSuitelet({
                scriptId: 'customscript_l54_gen_padron_sl',
                deploymentId: 'customdeploy_l54_gen_padron_sl',
                parameters: {
                    'suitelet': '',
                    'status' : 'ERROR',
                    'message': mensaje.toString()
                }
            });
        }
    }

    report.RG830 = function (context){
        try {
            var method = context.request.method;
            
            if (method == 'GET') {
                let nameReport = 'AR - Proceso de Carga de Padrones';

                UserInterface.createForm(nameReport);
                UserInterface.setClientScript('./L54 - Generador Padrondes (CL).js');
                
                let suitelet = UserInterface.addField('suitelet', 'text', 'Tipo Vista: ');
                               UserInterface.addField('custpage_file', 'file', 'Seleccionar Archivo: ').setMandatory(true);
            
                suitelet.setDefaultValue('RG830');
                suitelet.updateDisplayType('HIDDEN');

                UserInterface.addSubmitButton('Procesar Padrones');
                UserInterface.addButton('custpage_volver', 'Volver', 'volver()');

                context.response.writePage(UserInterface.FORM);
            } else if (method == 'POST') {
                let folderID = getFolder('FolderPadrones'),
                    request = context.request,
                    uploadedFile = request.files.custpage_file,
                    MAX_SIZE = 10 * 1024 * 1024;
            
                if (!uploadedFile) {
                    throw new Error('No se seleccionó ningún archivo');
                }

                uploadedFile.folder = folderID
                uploadedFile.name = 'padronRG830_' + new Date().toJSON() + '.txt'
                
                log.debug('INFORMACION', JSON.stringify(uploadedFile))
                
                let archivoID = uploadedFile.save();

                log.debug('archivoID', archivoID);

                let jsonResult = {
                    archivo: archivoID,
                    user: runtime.getCurrentUser().id,
                    fileName: uploadedFile.name
                }

                let params = {
                    custscript_l54_pad_rg830_mr_input: JSON.stringify(jsonResult)
                }

                submitMapReduceTask(jsonResult, params,'customscript_l54_pad_rg830_mr', 'customdeploy_l54_pad_rg830_mr');

                redirect.toSuitelet({
                    scriptId: 'customscript_l54_gen_padron_sl',
                    deploymentId: 'customdeploy_l54_gen_padron_sl',
                    parameters: {
                        'suitelet': '',
                        'status' : 'OK'
                    }
                });
            }
        } catch (error) {
            let mensaje = 'Ocurrio un error - Detalles: ' + error.message
            log.error('Error en report.RG830 ', mensaje);
            redirect.toSuitelet({
                scriptId: 'customscript_l54_gen_padron_sl',
                deploymentId: 'customdeploy_l54_gen_padron_sl',
                parameters: {
                    'suitelet': '',
                    'status' : 'ERROR',
                    'message': mensaje.toString()
                }
            });
        }
    }

    report.SIRCIP = function (context){
        try {
            var method = context.request.method;
            
            if (method == 'GET') {
                let nameReport = 'AR - Proceso de Carga de Padrones';

                UserInterface.createForm(nameReport);
                UserInterface.setClientScript('./L54 - Generador Padrondes (CL).js');
                
                let suitelet = UserInterface.addField('suitelet', 'text', 'Tipo Vista: ');
                               UserInterface.addField('custpage_file', 'file', 'Seleccionar Archivo: ').setMandatory(true);
                               UserInterface.addField('custpage_period', 'select', 'Seleccione el Periodo Correpondiente: ', null, 'accountingperiod').setMandatory(true);
            
                suitelet.setDefaultValue('SIRCIP');
                suitelet.updateDisplayType('HIDDEN');

                UserInterface.addSubmitButton('Procesar Padrones');
                UserInterface.addButton('custpage_volver', 'Volver', 'volver()');

                context.response.writePage(UserInterface.FORM);
            } else if (method == 'POST') {
                let folderID = getFolder('FolderPadrones'),
                    request = context.request,
                    uploadedFile = request.files.custpage_file,
                    periodo = request.files.custpage_period,
                    MAX_SIZE = 10 * 1024 * 1024;
            
                if (!uploadedFile) {
                    throw new Error('No se seleccionó ningún archivo');
                }

                uploadedFile.folder = folderID
                uploadedFile.name = 'padronSIRCIP_' + new Date().toJSON() + '.txt'
                
                log.debug('INFORMACION', JSON.stringify(uploadedFile))
                
                let archivoID = uploadedFile.save();

                log.debug('archivoID', archivoID);

                let jsonResult = {
                    archivo: archivoID,
                    user: runtime.getCurrentUser().id,
                    periodo: periodo,
                    fileName: uploadedFile.name
                }

                let params = {
                    custscript_l54_pad_sircip_mr_input: JSON.stringify(jsonResult),
                    custscript_l54_pad_sircip_mr_period: periodo
                }

                submitMapReduceTask(jsonResult, params,'customscript_l54_pad_sircip_mr', 'customdeploy_l54_pad_sircip_mr');

                redirect.toSuitelet({
                    scriptId: 'customscript_l54_gen_padron_sl',
                    deploymentId: 'customdeploy_l54_gen_padron_sl',
                    parameters: {
                        'suitelet': '',
                        'status' : 'OK'
                    }
                });
            }
        } catch (error) {
            let mensaje = 'Ocurrio un error - Detalles: ' + error.message
            log.error('Error en report.SIRCIP ', mensaje);
            redirect.toSuitelet({
                scriptId: 'customscript_l54_gen_padron_sl',
                deploymentId: 'customdeploy_l54_gen_padron_sl',
                parameters: {
                    'suitelet': '',
                    'status' : 'ERROR',
                    'message': mensaje.toString()
                }
            });
        }
    }

    report.EMBARGOS = function (context){
        try {
            var method = context.request.method;
            
            if (method == 'GET') {
                let nameReport = 'AR - Proceso de Carga de Padrones';

                UserInterface.createForm(nameReport);
                UserInterface.setClientScript('./L54 - Generador Padrondes (CL).js');
                
                let suitelet = UserInterface.addField('suitelet', 'text', 'Tipo Vista: ');
                               UserInterface.addField('custpage_file', 'file', 'Seleccionar Archivo: ').setMandatory(true);
                               UserInterface.addField('custpage_period', 'select', 'Seleccione el Periodo Correpondiente: ', null, 'accountingperiod').setMandatory(true);
            
                suitelet.setDefaultValue('EMBARGOS');
                suitelet.updateDisplayType('HIDDEN');

                UserInterface.addSubmitButton('Procesar Padrones');
                UserInterface.addButton('custpage_volver', 'Volver', 'volver()');

                context.response.writePage(UserInterface.FORM);
            } else if (method == 'POST') {
                let folderID = getFolder('FolderPadrones'),
                    request = context.request,
                    uploadedFile = request.files.custpage_file,
                    periodo = context.request.parameters.custpage_period,
                    MAX_SIZE = 10 * 1024 * 1024;
            
                if (!uploadedFile) {
                    throw new Error('No se seleccionó ningún archivo');
                }

                uploadedFile.folder = folderID
                uploadedFile.name = 'padronEmbargos_' + new Date().toJSON() + '.txt'
                
                log.debug('INFORMACION', JSON.stringify(uploadedFile))
                
                let archivoID = uploadedFile.save();

                log.debug('archivoID', archivoID);

                var periodoData = getAccountingPeriod(periodo);

                let jsonResult = {
                    archivo: archivoID,
                    user: runtime.getCurrentUser().id,
                    periodo: periodo,
                    periodoFormat: periodoData.periodoFormat,
                    periodoFormatEmbargos: periodoData.periodoFormatEmbargos,
                    periodoPrevio: periodoData.periodoPrevio,
                    fileName: uploadedFile.name
                }

                let params = {
                    custscript_l54_carga_padron_em_mr_input: JSON.stringify(jsonResult),
                    custscript_l54_carga_padron_em_mr_per: periodo
                }

                submitMapReduceTask(jsonResult, params,'customscript_l54_carga_padron_em_mr', 'customdeploy_l54_carga_padron_em_mr');

                redirect.toSuitelet({
                    scriptId: 'customscript_l54_gen_padron_sl',
                    deploymentId: 'customdeploy_l54_gen_padron_sl',
                    parameters: {
                        'suitelet': '',
                        'status' : 'OK'
                    }
                });
            }
        } catch (error) {
            let mensaje = 'Ocurrio un error - Detalles: ' + error.message
            log.error('Error en report.SIRCIP ', mensaje);
            redirect.toSuitelet({
                scriptId: 'customscript_l54_gen_padron_sl',
                deploymentId: 'customdeploy_l54_gen_padron_sl',
                parameters: {
                    'suitelet': '',
                    'status' : 'ERROR',
                    'message': mensaje.toString()
                }
            });
        }
    }

    const getFolder = (folderName) => {
        let folderID;
        const results = InitSearch.getSearchCreated(
            'folder', 
            [
                ['name', 'is', folderName]
            ], 
            [
                { name: 'internalid', alias: 'ID' }
            ]);

        if (!results || results.length === 0) {
            const newFolder = record.create({ type: 'folder' });
            newFolder.setValue('name', folderName);
            folderID = newFolder.save();
        } else {
            folderID = results[0].ID;
        }
        return folderID;
    };

    const getAccountingPeriod = (idPeriodo) =>{
        log.debug("idPeriodo", idPeriodo)
        try {
            var periodoData = {
                periodoFormat: "",
                periodoFormatEmbargos: "",
                periodoPrevio: ""
            };
            let filtros = [];

           
            filtros.push({
                name: "internalid",
                operator: "IS",
                values: idPeriodo
            });
            
            let filters = filtros.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));
            log.debug("filters", filters)
            const resultados = InitSearch.getResultSearch("customsearch_l54_period_carga_padron", filters, ['internalid', 'periodname', 'startdate', 'periodformat', 'formatembargos']);//DIS
            log.debug("resultados",resultados)
            if (resultados.length > 0) {
                periodoData.periodoFormat = resultados[0].periodformat || "";
                periodoData.periodoFormatEmbargos = resultados[0].formatembargos || "";
                
                let resultadoPrevio = InitSearch.getSearchCreated(
                    "accountingperiod", 
                    [['startdate', 'before', resultados[0].startdate],
                        "AND",
                        ['isadjust', 'is', 'F'], // Opcional: excluir periodos de ajuste
                        "AND",
                        ['isquarter', 'is', 'F'],
                        "AND",
                        ['isyear', 'is', 'F']
                    ], [
                    { name: 'internalid', alias: 'internalid' }, 
                    { name: 'periodname', alias: 'periodname' }, 
                    { name: 'startdate', alias: 'startdate', sort: 'DESC' }, 
                    { name: 'formulatext', formula:"TO_CHAR({startdate},'YYYYMMDD')", alias: 'form' },
                    ]
                )
                
                if (resultadoPrevio.length > 0) {
                    periodoData.periodoPrevio = resultadoPrevio[0].form || "";
                }
            }

            return periodoData;
        } catch (error) {
            log.error("PERIODO_ERROR", error);
            return { periodoFormat: "", periodoFormatEmbargos: "" };
        }
    }

    const submitMapReduceTask = (input, params, script, deploy) => {
        log.debug('params:', JSON.stringify(params));

        let scriptTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: script,
            deploymentId: deploy,
            params
        });
        let scriptTaskId = scriptTask.submit();
    }

    return {
        onRequest: onRequest
    };
});