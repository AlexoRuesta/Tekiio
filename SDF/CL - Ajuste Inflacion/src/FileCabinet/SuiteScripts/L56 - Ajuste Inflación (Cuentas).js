/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 * @NAmdConfig /SuiteScripts/L56 - configuration.json
 *@NModuleScope Public
 */
 define(["N/record", "N/search", "N/runtime", "N/email", "N/file","N/format", "N/render", "N/file", "N/encode","N/task","L56/utilidades"],

    function (record, search, runtime, email, file,format, render, file, encode,task, utilities) {

        function getParams() {
            try {
                let informacion = new Object();
                let currScript = runtime.getCurrentScript();
                informacion.automatico = currScript.getParameter("custscript_l56_ajustinflacion_automa");
                log.audit('informacion',informacion)
                if(informacion.automatico === true || informacion.automatico === 'true'){
                    //let ejecutarAjusteInflacionReturn = ejecutarAjusteInflacion();
                    //log.audit('ejecutarAjusteInflacionReturn',ejecutarAjusteInflacionReturn)
                    //informacion = {...ejecutarAjusteInflacionReturn, automatico: true , ejecutar: true}
                }else{
                    informacion.periodIni = currScript.getParameter("custscript_l56_ajustinflacion_periodini");
                    informacion.periodFin = currScript.getParameter("custscript_l56_ajustinflacion_periodfin");
                    informacion.cuentaAjuste = currScript.getParameter("custscript_l56_ajustinflacion_cuentaajus");
                    informacion.libroAjuste = currScript.getParameter("custscript_l56_ajustinflacion_libroaju");
                    informacion.libroPrincipal = currScript.getParameter("custscript_l56_ajustinflacion_libroprinc");
                    informacion.subsidiary = currScript.getParameter("custscript_l56_ajustinflacion_subsidiary");
                    informacion.folder = currScript.getParameter("custscript_l56_ajustinflacion_folder");
                    informacion.email = currScript.getParameter("custscript_l56_ajustinflacion_email");
                    informacion.createJournal = currScript.getParameter("custscript_l56_ajustinflacion_genjour") === 'true' || currScript.getParameter("custscript_l56_ajustinflacion_genjour") === true ;
                    informacion.createJournalAuth = currScript.getParameter("custscript_l56_ajustinflacion_jourauth") === 'true' || currScript.getParameter("custscript_l56_ajustinflacion_jourauth") === true;
                }
                


                log.audit('informacion',informacion)
                 
                let periodIniInfo =  search.lookupFields({
                    type: "accountingperiod",
                    id: informacion.periodIni,
                    columns: ["startdate","periodname","parent"]
                });
                informacion.dateIniFormatted = periodIniInfo.startdate;
                informacion.periodIniName = periodIniInfo.periodname;

                let periodFinInfo =  search.lookupFields({
                    type: "accountingperiod",
                    id: informacion.periodFin,
                    columns: ["enddate","periodname"]
                });
                informacion.dateFinFormatted = periodFinInfo.enddate;
                informacion.periodFinName = periodFinInfo.periodname;
                informacion.dateFinParsed = format.parse({
                    value: informacion.dateFinFormatted,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_BUENOS_AIRES
                });

                let quarterAuxId = periodIniInfo.parent[0].value;
                let yearAuxId = search.lookupFields({
                    type: "accountingperiod",
                    id: quarterAuxId,
                    columns: ["parent"]
                });
                informacion.yearId = yearAuxId.parent[0].value;
                let yearInfo =  search.lookupFields({
                    type: "accountingperiod",
                    id: informacion.yearId,
                    columns: ["enddate","startdate"]
                });
                informacion.yearIniFormatted = yearInfo.startdate;
                informacion.yearFinFormatted = yearInfo.enddate;

                if(!utilities.isEmpty(informacion.subsidiary)){
                    let subsidInfo = search.lookupFields({
                        type: "subsidiary",
                        id: informacion.subsidiary,
                        columns: ["name"]
                    });
                    informacion.subsidName = subsidInfo.name; 
                }
   
                return informacion;
            } catch (excepcion) {
                log.error("getParams", "getParams - Excepcion : " + excepcion.message.toString());
                return null;
            }
        }
        function getFeatures(){
            try{
                let features = {}
                features.MULTIBOOK = runtime.isFeatureInEffect({
                    feature: 'MULTIBOOK'
                });
                return features;
            } catch (excepcion) {
                log.error("getFeatures", "getFeatures - Excepcion : " + excepcion.message.toString());
                return null;
            }
        }

        function getCuentasNoMonetarias(scriptParams,features){
            try{
                var savedSearch = search.create({
                type: "account",
                filters:
                [
                    ["custrecord_l56_cta_no_monetaria","is","T"]
                ],
                columns:
                [
                    search.createColumn({name: "internalid", label: "Internal ID"}),
                    search.createColumn({name: "displayname", label: "Display Name"}),
                    search.createColumn({name: "custrecord_l56_axi_cta_recpam"}),
                    search.createColumn({name: "custrecord_l56_axi_cta_base"})
                ]
                });
                log.audit('savedSearch',savedSearch)
    
                let resultSearch = savedSearch.run();
                let completeResultSet = [];
                let resultIndex = 0;
                let resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                let resultado; // temporary variable used to store the result set
       
                do {
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });
                    if (!utilities.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
       
                    // increase pointer 
                    resultIndex = resultIndex + resultStep;
       
                } while (!utilities.isEmpty(resultado) && resultado.length > 0)

                let cuentasInformacion = {};

                for (var i = 0; i < completeResultSet.length; i++) {
                    let accountId = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[0]
                    });
                    let accountName = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[1]
                    });
                    //*AJUSTE
                    let accountAjusteId = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[2]
                    });
                    let accountAjusteName = completeResultSet[i].getText({
                        name: completeResultSet[i].columns[2]
                    });
                    let superponeCuentaAjuste = !utilities.isEmpty(accountAjusteId);
                    //*BASE
                    let accountBaseId = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[3]
                    });
                    let accountBaseName = completeResultSet[i].getText({
                        name: completeResultSet[i].columns[3]
                    });
                    let superponeCuentaBase = !utilities.isEmpty(accountBaseId);
                    cuentasInformacion[accountId] = {
                        accountBaseId:  superponeCuentaBase? accountBaseId : accountId,
                        accountBaseName: superponeCuentaBase? accountBaseName : accountName,
                        accountAjusteId: superponeCuentaAjuste? accountAjusteId : scriptParams.cuentaAjuste,
                    }
                }
                return cuentasInformacion;
            }catch(error){
                log.error("getCuentasNoMonetarias", "getCuentasNoMonetarias - Error : " + error.message.toString());
                return {};  
            }
        }
        function getReportAjusteInflacionSaldos(scriptParams,features,indicesInflacion,accountInformation){
            try{
                let savedSearch = search.load({
                    id: "customsearch_l56_ajuste_inflacion_saldo"
                });

                if(!utilities.isEmpty(scriptParams.periodIni)){
                    let periodIniFilter = search.createFilter({
                        name: "startdate",
                        operator: "before",
                        join: "accountingperiod",
                        values: scriptParams.dateIniFormatted
                    })
                    savedSearch.filters.push(periodIniFilter);
                }

                if(!utilities.isEmpty(scriptParams.subsidiary)){
                    let periodSubsidFilter = search.createFilter({
                        name: "subsidiary",
                        operator: "anyof",
                        values: scriptParams.subsidiary
                    })
                    savedSearch.filters.push(periodSubsidFilter);
                }

                if(features.MULTIBOOK && !utilities.isEmpty(scriptParams.libroPrincipal)){
                    let multibookFilter = search.createFilter({
                        name: "accountingbook",
                        join: "accountingTransaction",
                        operator: "anyof",
                        values: scriptParams.libroPrincipal
                    })
                    savedSearch.filters.push(multibookFilter);
                    let multibookAccount = search.createColumn({
                        name: "account",
                        join: "accountingTransaction",
                        summary: "GROUP",
                        label: "Cuenta"
                    });
                    savedSearch.columns[0] = multibookAccount;
                    let multibookDebit = search.createColumn({
                        name: "formulanumeric",
                        summary: "SUM",
                        formula: "NVL({accountingtransaction.debitamount},0)",
                        join: "accountingTransaction",
                    })
                    savedSearch.columns[1] = multibookDebit;
                    let multibookCredit = search.createColumn({
                        name: "formulanumeric",
                        summary: "SUM",
                        formula: "NVL({accountingtransaction.creditamount},0)",
                        join: "accountingTransaction",
                    })
                    savedSearch.columns[2] = multibookCredit;
                    let multibookSaldo = search.createColumn({
                        name: "formulanumeric",
                        summary: "SUM",
                        formula: "NVL({accountingtransaction.debitamount},0) - NVL({accountingtransaction.creditamount},0)",
                        label: "Fórmula (numérica)"
                    })
                    savedSearch.columns[3] = multibookSaldo;
                }
                log.audit('savedSearch',savedSearch)
    
                let resultSearch = savedSearch.run();
                let completeResultSet = [];
                let resultIndex = 0;
                let resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                let resultado; // temporary variable used to store the result set
       
                do {
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });
                    if (!utilities.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
       
                    // increase pointer 
                    resultIndex = resultIndex + resultStep;
       
                } while (!utilities.isEmpty(resultado) && resultado.length > 0)

                let ajutesInflacionLines = [];
                let IPCSaldo = indicesInflacion.IPCSaldo
                log.audit('IPCSaldo ',IPCSaldo )

                for (var i = 0; i < completeResultSet.length; i++) {
                    let accountId = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[0]
                    });
                    let accountName = completeResultSet[i].getText({
                        name: completeResultSet[i].columns[0]
                    });
                    let debit = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[1]
                    });
                    let credit = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[2]
                    });
                    let saldo = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[3]
                    });
                    let saldoPasado = true;
                    let IPC = IPCSaldo;
                    let accountReemplazoId = accountInformation[accountId].accountBaseId;
                    let accountAjusteId = accountInformation[accountId].accountAjusteId;
                    ajutesInflacionLines.push({accountId,accountName,accountReemplazoId,accountAjusteId,debit,credit,saldo,IPC,saldoPasado})
                }
                
       
                return ajutesInflacionLines;
                
            }catch(error){
                log.error("getReportAjusteInflacion", "getReportAjusteInflacion - Error : " + error.message.toString());
                let mensaje = "getReportAjusteInflacion - Error: " + error.message; 
                let respuesta = [{"error": true, "detalles_errores": mensaje}];
                return respuesta;  
            }

        }
        function getReportAjusteInflacion(scriptParams,features,indicesInflacion,accountInformation){
            try{
                let savedSearch = search.load({
                    id: "customsearch_l56_ajuste_inflacion"
                });

                if(!utilities.isEmpty(scriptParams.periodIni)){
                    let periodIniFilter = search.createFilter({
                        name: "startdate",
                        operator: "onorafter",
                        join: "accountingperiod",
                        values: scriptParams.dateIniFormatted
                    })
                    savedSearch.filters.push(periodIniFilter);
                }

                if(!utilities.isEmpty(scriptParams.periodFin)){
                    let periodFinFilter = search.createFilter({
                        name: "enddate",
                        operator: "onorbefore",
                        join: "accountingperiod",
                        values: scriptParams.dateFinFormatted
                    })
                    savedSearch.filters.push(periodFinFilter);
                }

                if(!utilities.isEmpty(scriptParams.subsidiary)){
                    let periodSubsidFilter = search.createFilter({
                        name: "subsidiary",
                        operator: "anyof",
                        values: scriptParams.subsidiary
                    })
                    savedSearch.filters.push(periodSubsidFilter);
                }

                if(features.MULTIBOOK && !utilities.isEmpty(scriptParams.libroPrincipal)){
                    let multibookFilter = search.createFilter({
                        name: "accountingbook",
                        join: "accountingTransaction",
                        operator: "anyof",
                        values: scriptParams.libroPrincipal
                    })
                    savedSearch.filters.push(multibookFilter);
                    let multibookAccount = search.createColumn({
                        name: "account",
                        join: "accountingTransaction",
                        summary: "GROUP",
                        label: "Cuenta",
                    });
                    savedSearch.columns[1] = multibookAccount;
                    let multibookDebit = search.createColumn({
                        name: "formulanumeric",
                        summary: "SUM",
                        formula: "NVL({accountingtransaction.debitamount},0)",
                        join: "accountingTransaction",
                    })
                    savedSearch.columns[7] = multibookDebit;
                    let multibookCredit = search.createColumn({
                        name: "formulanumeric",
                        summary: "SUM",
                        formula: "NVL({accountingtransaction.creditamount},0)",
                        join: "accountingTransaction",
                    })
                    savedSearch.columns[8] = multibookCredit;
                    let multibookSaldo = search.createColumn({
                        name: "formulanumeric",
                        summary: "SUM",
                        formula: "NVL({accountingtransaction.debitamount},0) - NVL({accountingtransaction.creditamount},0)",
                        label: "Fórmula (numérica)"
                    })
                    savedSearch.columns[9] = multibookSaldo;
                }
                log.audit('savedSearch',savedSearch)
                log.audit('savedSearch.type',savedSearch["type"])
                    
                let resultSearch = savedSearch.run();
                let completeResultSet = [];
                let resultIndex = 0;
                let resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                let resultado; // temporary variable used to store the result set
       
                do {
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });
                    if (!utilities.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
       
                    // increase pointer 
                    resultIndex = resultIndex + resultStep;
       
                } while (!utilities.isEmpty(resultado) && resultado.length > 0)

                let ajutesInflacionLines = [];
                let IPCSaldo = indicesInflacion.IPCSaldo

                for (var i = 0; i < completeResultSet.length; i++) {
                    let accountId = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[1]
                    });
                    let accountName = completeResultSet[i].getText({
                        name: completeResultSet[i].columns[1]
                    });
                    let transType = completeResultSet[i].getText({
                        name: completeResultSet[i].columns[2]
                    }); 
                    let transDate = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[3]
                    }); 
                    let periodId = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[4]
                    });
                    let periodName = completeResultSet[i].getText({
                        name: completeResultSet[i].columns[4]
                    });
                    let transName = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[5]
                    });
                    let entityName = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[6]
                    });
                    let debit = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[7]
                    });
                    let credit = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[8]
                    });
                    let saldo = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[9]
                    });
                    let IPC = indicesInflacion[periodId].IPC
                    let accountReemplazoId = accountInformation[accountId].accountBaseId;
                    let accountAjusteId = accountInformation[accountId].accountAjusteId;
                    ajutesInflacionLines.push({accountId,accountName,accountReemplazoId,accountAjusteId,transType,transDate,periodId,periodName,transName,entityName,
                    debit,credit,saldo,IPC,IPCSaldo})

                }
                
       
                return ajutesInflacionLines;
                
            }catch(error){
                log.error("getReportAjusteInflacion", "getReportAjusteInflacion - Error : " + error.message.toString());
                let mensaje = "getReportAjusteInflacion - Error: " + error.message; 
                let respuesta = [{"error": true, "detalles_errores": mensaje}];
                return respuesta;  
            }

        }
        function getAccountingPeriods(scriptParams){
            try{
                let savedSearch = search.create({
                    type: "accountingperiod",
                    filters:
                    [
                       ["startdate","onorafter",scriptParams.yearIniFormatted], 
                       "AND", 
                       ["enddate","onorbefore",scriptParams.yearFinFormatted], 
                       "AND", 
                       ["isyear","is","F"], 
                       "AND", 
                       ["isquarter","is","F"]
                    ],
                    columns:
                    [
                        search.createColumn({name: "enddate", sort: search.Sort.ASC }),
                        search.createColumn({name: "periodname", label: "Nombre"}),
                        search.createColumn({name: "internalid", label: "ID interno"})
                    ]
                });
                let resultSearch = savedSearch.run();
                let completeResultSet = [];
                let resultIndex = 0;
                let resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                let resultado; // temporary variable used to store the result set
                do {
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });
                    if (!utilities.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
       
                    // increase pointer 
                    resultIndex = resultIndex + resultStep;
       
                } while (!utilities.isEmpty(resultado) && resultado.length > 0)
                let periodAux = null;
                let periodsInformation = {}
                for (var i = 0; i < completeResultSet.length; i++) {
                    let periodId = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[2]
                    });
                    let periodName = completeResultSet[i].getValue({
                        name: completeResultSet[i].columns[1]
                    }); 
                    let periodPrev = periodAux;
                    periodAux = periodId;
                    periodsInformation[periodId] = ({periodId,periodName,periodPrev})
                }
                return periodsInformation
            }
            catch(error){
                log.error("getAccountingPeriods", "getAccountingPeriods- Error : " + error.message.toString());
                let mensaje = "getAccountingPeriods - Error: " + error.message; 
                let respuesta = [{"error": true, "detalles_errores": mensaje}];
                return respuesta;
            }
        }
   
        function getIndicesAjusteInflacion(scriptParams,periodsInformation){
            try{
                let savedSearch = search.create({
                    type: "customrecord_l56_axi_indice",
                    filters: ["custrecord_l56_axi_indice_per_adq","equalto",scriptParams.yearId],
                    columns:
                    [
                       search.createColumn({name: "custrecord_l56_axi_indice_num", label: "Indice"}),
                    ]
                });
                let resultSearch = savedSearch.run();
                let completeResultSet = [];
                let resultIndex = 0;
                let resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                let resultado; // temporary variable used to store the result set
                do {
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });
                    if (!utilities.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
       
                    // increase pointer 
                    resultIndex = resultIndex + resultStep;
       
                } while (!utilities.isEmpty(resultado) && resultado.length > 0)

                let indicesInflacion = {};
                let indicesInflacionAux = {};
                if(completeResultSet.length >0){
                    //PARA EL PRIMER PERIODO CONFIGURADO
                    indicesInflacionAux = JSON.parse(completeResultSet[0].getValue({
                        name: completeResultSet[0].columns[0]
                    }));
                }


                let listPeriods = Object.keys(periodsInformation)
                let IPC = 0;
                let IPCSaldo = 0;
                let periodSaldo = periodsInformation[scriptParams.periodIni].periodPrev || 0;
                for (var i = 0; i < indicesInflacionAux.length; i++) {
                    let {value,col,row} = indicesInflacionAux[i];
                    log.debug('Audit->',{value,col,row})
                    if(col != scriptParams.periodFin ){
                        continue;
                    }
                    if(row == periodSaldo){
                        IPCSaldo = (100+parseFloat(value))/100;
                    }
                    if(!listPeriods.includes(row)){
                        continue;
                    }

                
                    let periodId = row;
                    IPC = (100+parseFloat(value))/100;
                    periodName = periodsInformation[periodId].periodName;
                    periodId = row;
                    
                    
                    
                    indicesInflacion[periodId] = ({periodId,periodName,IPC})
                }
                indicesInflacion.IPCSaldo = IPCSaldo;

                return indicesInflacion;
            }
            catch(error){
                log.error("getIndicesAjusteInflacion", "getIndicesAjusteInflacion - Error : " + error.message.toString());
                let mensaje = "getIndicesAjusteInflacion - Error: " + error.message; 
                let respuesta = [{"error": true, "detalles_errores": mensaje}];
                return respuesta;
            }
        }
        function createJournalAjuste(inflacionLines,scriptParams,obligCampos){
            try{

                inflacionLines = inflacionLines.filter((line)=> {return line.acumuladoAjuste != 0})
                if(inflacionLines.length == 0){
                    log.error('No hay lineas para el Journal de Ajuste')
                    return null;
                }
                let camposList = [];
                if(!utilities.isEmpty(obligCampos) && !utilities.isEmpty(obligCampos.campos) ){
                    camposList = obligCampos.campos;
                }
                let journalEntry = record.create({
                    type: record.Type.JOURNAL_ENTRY,
                    isDynamic: true,
                    defaultValues: {
                        bookje: 'T' //Book Specific Journal
                    }
                });
                if(scriptParams.createJournalAuth){
                    journalEntry.setValue({ fieldId: "approved", value: true });
                }else{
                    journalEntry.setValue({ fieldId: "approved", value: false });
                }
                
                journalEntry.setValue({
                    fieldId: 'accountingbook',
                    value: scriptParams.libroAjuste
                });
                journalEntry.setValue({
                    fieldId: 'subsidiary',
                    value: scriptParams.subsidiary
                });
                journalEntry.setValue({
                    fieldId: 'trandate', 
                    value: scriptParams.dateFinParsed
                });
                journalEntry.setValue({
                    fieldId: 'memo',
                    value: `Propuesta Ajuste Inflacion de ${scriptParams.periodIniName} hasta ${scriptParams.periodFinName}`
                });
                

                let acumRECPAM = {};
                for(let i=0;i<inflacionLines.length;i++){

                    //* LINEA CUENTA PRINCIPAL
                    journalEntry.selectNewLine({
                        sublistId: 'line'
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: inflacionLines[i].accountReemplazoId 
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'debit',
                        value: inflacionLines[i].acumuladoAjuste
                    });
                    //*CAMPOS OBLIGATORIOS
                    for (let ii=0; ii<camposList.length ; ii++){
                      let value = obligCampos.campos[ii].value;
                      let fieldId = obligCampos.campos[ii].fieldId;
                      journalEntry.setCurrentSublistValue({ sublistId: "line", fieldId: fieldId, value: value, ignoreFieldChange: true })
                    }
                    //*FIN CAMPOS OBLIGATORIOS
                    journalEntry.commitLine({
                        sublistId: 'line'
                    });
                    if(acumRECPAM[inflacionLines[i].accountAjusteId] ==undefined){
                        acumRECPAM[inflacionLines[i].accountAjusteId] = 0;
                    }
                    acumRECPAM[inflacionLines[i].accountAjusteId] += inflacionLines[i].acumuladoAjuste
                }
                log.audit('acumRECPAM',acumRECPAM)
                for (const acc in acumRECPAM) {
                    log.audit('acumRECPAM -> '+acc,parseFloat((acumRECPAM[acc]).toFixed()))
                    //* LINEA CUENTA RECPAM
                    journalEntry.selectNewLine({
                        sublistId: 'line'
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: acc
                    });
                    journalEntry.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'credit',
                        value: acumRECPAM[acc]
                    });
                    //*CAMPOS OBLIGATORIOS
                    for (let ii=0; ii<camposList.length ; ii++){
                        let value = obligCampos.campos[ii].value;
                        let fieldId = obligCampos.campos[ii].fieldId;
                        journalEntry.setCurrentSublistValue({ sublistId: "line", fieldId: fieldId, value: value, ignoreFieldChange: true })
                    }
                    //*FIN CAMPOS OBLIGATORIOS
                    journalEntry.commitLine({
                        sublistId: 'line'
                    });
                }
                //! //////////////////////////
                var numLines = journalEntry.getLineCount({
                    sublistId: 'line'
                });
                var acum= 0
                var acumCredit = 0;
                var acumDebit = 0 ;
                for(let i=0;i<numLines;i++){
                    var debit = journalEntry.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'debit',
                        line: i
                    });
                    acum += (parseFloat(debit) || 0);
                    acumDebit  += (parseFloat(debit) || 0);
                    var credit = journalEntry.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'credit',
                        line: i
                    });
                    acum -= (parseFloat(credit) || 0);
                    acumCredit += (parseFloat(credit) || 0);
                    var account = journalEntry.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        line: i
                    });
                    log.emergency('',{debit,credit,account,acum,acumDebit,acumCredit});

                }
                //! //////////////////////////

                let idJournal = journalEntry.save({
                    enableSourcing: false,
                    ignoreMandatoryFields : true
                });
                log.debug('createJournalAjuste - idJournal', idJournal)
                return idJournal

            }catch(error){
                log.error("createJournalAjuste", "createJournalAjuste - Error : " + error.message.toString());
            }

        }
        function createExcelReporte(inflacionLines,scriptParams){
            try{   
                let rendererXML = render.create();
                let fileXML = file.load({
                    id: './L56 - Ajuste Inflacion (Cuentas) - Plantilla.ftl'
                });
                let templateXML = fileXML.getContents();
                rendererXML.templateContent = templateXML;
                let objData = {}
                objData.lines = inflacionLines;
                objData.params = scriptParams;
                log.audit('objData',objData)
                rendererXML.addCustomDataSource({
                    format: render.DataSource.OBJECT,
                    alias: "obj_data",
                    data: objData
                });

                let stringXML = rendererXML.renderAsString(); // transform to string

                let stringEncoded = encode.convert({
                    string: stringXML,
                    inputEncoding: encode.Encoding.UTF_8,
                    outputEncoding: encode.Encoding.BASE_64
                });
                const fechaAct = new Date();

                // creating the final XML file
                let fileObj = file.create({
                    name: `Ajuste_Inflacion_Cuentas ${scriptParams.subsidName} - ${scriptParams.periodIniName} - ${scriptParams.periodFinName} - ${fechaAct.toJSON()}.xls`,
                    fileType: file.Type.EXCEL,
                    contents: stringEncoded,
                    folder: scriptParams.folder,
                });



                let idFileXLS = fileObj.save();
                log.debug('createExcelReporte - idFileXLS', idFileXLS)
                return idFileXLS


            }catch(error){
                log.error("createExcelReporte", "createExcelReporte - Error : " + error.message.toString());
            }
        }
        function createLog(scriptParams,mensaje,estado, fileId, transId){
            try{
                log.debug('createLog' , `createLog - Estado: ${estado} - Mensaje: ${mensaje}`)
                let logRecord= record.create({
                    type: "customrecord_l56_log_ajust_inf",

                });
                logRecord.setValue({
                    fieldId: 'custrecord_l56_log_ajusinf_subsid',
                    value: scriptParams.subsidiary
                });
                logRecord.setValue({
                    fieldId: 'custrecord_l56_log_ajusinf_per_ini',
                    value: scriptParams.periodIni
                });
                logRecord.setValue({
                    fieldId: 'custrecord_l56_log_ajusinf_per_fin',
                    value: scriptParams.periodFin
                });
                logRecord.setValue({
                    fieldId: 'custrecord_l56_log_ajustinf_det',
                    value: mensaje
                });
                logRecord.setValue({
                    fieldId: 'custrecord_l56_log_ajustinf_est',
                    value: estado
                });
                logRecord.setValue({
                    fieldId: 'custrecord_l56_log_ajusinf_report',
                    value: fileId
                });
                logRecord.setValue({
                    fieldId: 'custrecord_l56_log_ajusinf_jour',
                    value: transId
                });

                return logRecord.save()

            }catch(error){
                log.error("createLog", "createLog - Error : " + error.message.toString());
            }

        }
        function enviarEmail(emailUser, asunto, contenido, idAutor, fileId) {
            if (!utilities.isEmpty(idAutor)) {
              let attachments = null;
              attachments = [];
              if (!utilities.isEmpty(fileId)) {
                attachments.push(fileId);
              }
              email.send({
                author: idAutor,
                recipients: emailUser,
                subject: asunto,
                body: contenido,
                attachments: attachments,
              });
            }
        }
        function getInputData() {
            try {
                let scriptParams = getParams();
                log.audit('scriptParams',scriptParams);
                /*if(scriptParams.automatico && !scriptParams.ejecutar){
                    return [];
                }*/
                let features = getFeatures();
                log.audit('features',features);
                let periodsInformation = getAccountingPeriods(scriptParams);
                log.audit('periodsInformation',periodsInformation )
                let indicesInflacion = getIndicesAjusteInflacion(scriptParams,periodsInformation);
                log.debug('LINE 165 - indicesInflacion',indicesInflacion);
                let accountInformation = getCuentasNoMonetarias(scriptParams,features) 
                log.debug('LINE 968 -  accountInformation', accountInformation)
                let ajustInflacionListSaldo = getReportAjusteInflacionSaldos(scriptParams,features,indicesInflacion,accountInformation);
                let ajustInflacionListMov = getReportAjusteInflacion(scriptParams,features,indicesInflacion,accountInformation);
                let ajustInflacionList = ajustInflacionListSaldo.concat(ajustInflacionListMov)
                log.debug('LINE 166 - ajustInflacionListSaldo',ajustInflacionListSaldo);
                log.debug('LINE 166 - ajustInflacionListMov',ajustInflacionListMov);
                log.debug('LINE 166 - ajustInflacionList',ajustInflacionList);
                log.debug('LINE 171 - ajustInflacionList.length',ajustInflacionList.length);
                return ajustInflacionList;
            } catch (error) {
                log.error("GetInputData - Error", "Error: " + error.message);
                let mensaje = "GetInputData - Error: " + error.message; 
                let respuesta = [{"error": true, "detalles_errores": mensaje}];
                return respuesta;
                
            }
        }
   
        function map(context) {
   
            try {
                let resultado = JSON.parse(context.value);
                //log.debug("MAP", context.value)
                let key;
                if(resultado.error== true){
                    key = "ERROR";
                }else{
                    key = resultado.accountName;
                }
                context.write({
                    key: key,
                    value:resultado  
                })

   
            } catch (error) {
                log.error("Map - Error","Error: " + error.message);
            }
        }
   
        function reduce(context) {
      
            try {         
                log.audit('REDUCE context.values',  context.values)   
                let values = (context.values) 
                let acumuladoAjuste = 0;
                let acumuladoSaldo = 0;
                let acumuladoDebit = 0;
                let acumuladoCredit = 0;
                let acumuladoReex = 0;
                let detalleTrans = [];
                let dataGlobal = JSON.parse(values[0])
                if(!dataGlobal.error){
                    let detalleTransTitle;
                    for (let i = 0; i < values.length; i++) { 
                        let data = JSON.parse(values[i]);
                        data.reex = data.saldo*data.IPC;
                        data.reex = parseFloat((data.reex).toFixed())
                        data.ajuste = data.saldo*(data.IPC-1)
                        data.ajuste = parseFloat((data.ajuste).toFixed())
                        data.entityName = (data.entityName == "- None -") ? '': data.entityName
                        if(data.saldoPasado){
                            data.title = true;
                            data.foot = false;
                            detalleTransTitle = data;
                        }
                        else{
                            acumuladoAjuste+= parseFloat(data.ajuste);
                            acumuladoDebit += parseFloat(data.debit);
                            acumuladoCredit += parseFloat(data.credit);
                            acumuladoSaldo += parseFloat(data.saldo);
                            acumuladoReex += parseFloat(data.reex);
                            
                            data.title = false;
                            data.foot = false;
                            detalleTrans.push(data)
                        }

                    } 
                    if(detalleTransTitle == null){
                        detalleTransTitle = {...dataGlobal,title: true, saldo: 0, debit: 0, credit:0,ajuste: 0, reex:0, IPC: dataGlobal.IPCSaldo }
                    }
                    
                    let detalleTransFoot = {...detalleTransTitle, title: false, foot: true}
                    detalleTransFoot.saldo = parseFloat(detalleTransTitle.saldo) + acumuladoSaldo;
                    detalleTransFoot.debit = parseFloat(detalleTransTitle.debit) + acumuladoDebit;
                    detalleTransFoot.credit = parseFloat(detalleTransTitle.credit) + acumuladoCredit;
                    detalleTransFoot.ajuste = parseFloat(detalleTransFoot.ajuste) + acumuladoAjuste;
                    detalleTransFoot.reex = parseFloat(detalleTransFoot.reex) + acumuladoReex;

                    detalleTrans.sort((a,b) => {
                        if(a!=b){
                            let aDate = format.parse({value: a.transDate,type: format.Type.DATE})
                            let bDate = format.parse({value: b.transDate,type: format.Type.DATE})
                            return aDate > bDate ? 1 :-1
                        }else{
                            if(a!=b){
                                return a.transName > btransName ? 1 :-1
                            }else{
                                return 0
                            }
                        }
                    })
                    detalleTrans.splice(0,0,detalleTransTitle);
                    detalleTrans.push(detalleTransFoot);
                    
                    let returnReduce = {
                        accountId: dataGlobal.accountId,
                        accountName: dataGlobal.accountName,
                        accountAjusteId: dataGlobal.accountAjusteId,
                        accountReemplazoId: dataGlobal.accountReemplazoId,
                        acumuladoAjuste: parseFloat((detalleTransFoot.ajuste).toFixed()),
                        detalleTrans: detalleTrans
                    }
                    log.audit('REDUCE returnReduce',  returnReduce)  
                    context.write({
                        key: 1,
                        value:returnReduce
                    });
                }else{
                    log.audit('REDUCE returnReduce',  dataGlobal)  
                    context.write({
                        key: 1,
                        value:dataGlobal
                    });
                }
            } catch (error) {
                let mensaje = "Reduce " + context.key + " - Error: " + error.message; 
                let respuesta = [{"error": true, "detalles_errores": mensaje}];            
                log.error("Reduce " + context.key + " - Error", "Error: " + error.message + ", key: " + context.key);
                
                context.write(1, respuesta);
            }
   
            //context.write(context.key, respuesta);
        }
   
        function summarize(context) {
            try {
                log.debug("SUMMARIZE INFO - GetInputData Report", JSON.stringify(context.inputSummary));
                log.debug("SUMMARIZE INFO - Map Report", JSON.stringify(context.mapSummary));
                log.debug("SUMMARIZE INFO - Reduce Report", JSON.stringify(context.reduceSummary));
                log.debug("SUMMARIZE INFO - output", JSON.stringify(context.output));

                let totalReduceErrors = 0;
                let arrayReduceErrors = [];
                let errorReduce = false;
                let arrayReduceJournal = []
                let arrayReduceReporte = []
                context.output.iterator().each(function (key, value){
   
                    var respuesta = JSON.parse(value);
   
                    if(respuesta.error == true){
                        errorReduce = true;
                        arrayReduceErrors.push(respuesta.detalles_errores);
                        totalReduceErrors++;
                    }else{
                        arrayReduceJournal.push({
                            accountId: respuesta.accountId,
                            accountReemplazoId: respuesta.accountReemplazoId,
                            accountAjusteId: respuesta.accountAjusteId,
                            acumuladoAjuste: respuesta.acumuladoAjuste,
                        })
                        arrayReduceReporte = arrayReduceReporte.concat(respuesta.detalleTrans);
                    }
                    return true;
                });  
                let scriptParams = getParams();
                let errorGlobal = errorReduce;
                let mensajeError = `Error en proceso de Ajuste de Inflación: `
                let obligCampos = [];//getConfCamposObligatorios(scriptParams)
                if(!errorReduce){
                    log.audit('scriptParams',scriptParams)
                    let features = getFeatures();
                    log.audit('features',features);
                    //TODO: Revisar maximo de Lineas por crear en un Journal por script
                    if(arrayReduceReporte.length>0 && arrayReduceJournal.length>0){
                        log.audit('SUMMARIZE arrayReduceReporte',arrayReduceReporte)
                        let fileId = createExcelReporte(arrayReduceReporte,scriptParams,features);
                        log.audit('SUMMARIZE arrayReduceJournal',arrayReduceJournal)
                        let transId = null;
                        if(scriptParams.createJournal){
                            transId = createJournalAjuste(arrayReduceJournal,scriptParams,obligCampos);
                        }
                        scriptParams.log = createLog(scriptParams, "", "EXITOSO",fileId,transId);
                    }else{
                        errorGlobal = true;
                        arrayReduceErrors = "No existe data con los parámetros seleccionados."
                    }
                }
                if(errorGlobal){
                    log.error("errorReduce - Error", arrayReduceErrors)
                    createLog(scriptParams, arrayReduceErrors.toString(), "ERROR", null, null);
                    let descripcionMensajeFinal =  "<html><head></head><body><br>" + mensajeError + arrayReduceErrors.toString() + "<br></body></html>";
                    let asunto = "Proceso de Ajuste de Inflación Integral";
                    enviarEmail(scriptParams.email, asunto, descripcionMensajeFinal, scriptParams.email);
                }
   
            } catch (error) {
                log.error("Summarize - Error", "Error: " + error.message);
            }                
        }

   
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });