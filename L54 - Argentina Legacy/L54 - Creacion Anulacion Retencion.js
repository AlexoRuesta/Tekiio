/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 * Task          Date                Author                                         Remarks
 * DT-0000      07 octubre 2022       Jesus Salazar <jesus.salazar@tekiio.com.ar>       
 */
define(['N/record', 'N/error', 'N/search', 'L54/utilidades', 'N/runtime', 'N/format'],

    (record, error, search, utilities, runtime, format) => {

        const afterSubmit = (context) => {

            let proceso = 'afterSubmit';

            try {
                
                if (context.type != 'delete')
                {
                    log.debug(proceso, 'Inicio - obtencion de importes para el calculo de retenciones');
                    let script = runtime.getCurrentScript();
                    let recId = context.newRecord.id;
                    let recType = context.newRecord.type;
                    log.debug(proceso, 'recId: ' + recId + ' / recType: ' + recType);

                    let objRecord = record.load({
                        type: recType,
                        id: recId
                    });
                    var recAnul = objRecord.getValue({
                        fieldId: 'custrecord_l54_ret_ref_anul'
                    });
                    if(utilities.isEmpty(recAnul)){
                        var anulado = objRecord.getValue({
                            fieldId: 'custrecord_l54_ret_anulado'
                        });
                        if(!utilities.isEmpty(anulado) && (anulado == true || anulado == 'T')){
                            let idAnula = creacionRecordAnul(recId, objRecord);
                            if(!utilities.isEmpty(idAnula)){
                                objRecord.setValue({
                                    fieldId: 'custrecord_l54_ret_ref_anul',
                                    value: idAnula
                                });
                                let idRecord = objRecord.save();
                            }else{
                                log.debug(proceso, `No se pudo obtener el id del record de anulacion de retencion`);
                            }
                            log.debug(proceso, `Fin - obtencion de importes para el calculo de retenciones`);
                        }
                    }
                    
                }
           
            } catch (error) {
                log.error(proceso, `Ocurrio una excepcion mientras se obtenian los importes para el proceso de calculo de retenciones, detalles: ${error.message}`);
            }
        }

        function creacionRecordAnul(recIdRet ,recordRet){
            try{
                var objRecord = record.create({
                    type: 'customrecord_l54_anulacion_retencion',
                    isDynamic: true                       
                });
                objRecord.setValue({
                    fieldId: 'custrecord_l54_anul_ret_ref_retencion',
                    value: recIdRet
                });
                var fechaAnulacion = new Date();    
                var fechaAnulacionString = format.parse({
                    value: fechaAnulacion,
                    type: format.Type.DATE
                });
                objRecord.setValue({
                    fieldId: 'custrecord_l54_anul_ret_fecha',
                    value: fechaAnulacionString
                });
                let idRecord = objRecord.save();

                objRecord = record.load({
                    type: "customrecord_l54_anulacion_retencion",
                    id: idRecord
                });


                var numeroAnul = crearNumeradorAnul(recordRet,objRecord);
                if(!utilities.isEmpty(numeroAnul)){
                    objRecord.setValue({
                        fieldId: 'custrecord_l54_anul_ret_numerador',
                        value: numeroAnul
                    });
                    
                    objRecord.setValue({
                        fieldId: 'custrecord_l54_anul_ret_numerador',
                        value: numeroAnul
                    });
                    
                    let idRecord = objRecord.save();
                    return idRecord;
                }else{
                    log.debug('afterSubmit', `No se pudo obtener el numero de Anulacion de Retencion`);
                    return null;
                }
                
                

            } catch(error){
                log.error('afterSubmit', `Ocurrio una excepcion mientras se se creaba la anulacion de retencion, detalles: ${error.message}`);
            }
        }

        function crearNumeradorAnul(recordRet , recordAnul){
            try {
                let currScript = runtime.getCurrentScript();
                var VendorPaymentId = recordRet.getValue({
                    fieldId: 'custrecord_l54_ret_ref_pago_prov'
                });
                var tipoRetencion = recordRet.getValue({
                    fieldId: 'custrecord_l54_ret_tipo'
                });
                var jurisdiccion = recordRet.getValue({
                    fieldId: 'custrecord_l54_ret_jurisdiccion'
                });
                var bocaId = search.lookupFields({
                    type: 'vendorpayment',
                    id: VendorPaymentId,
                    columns: 'custbody_l54_boca'
                });

                var bocaId = recordAnul.getValue({
                    fieldId: 'custrecord_l54_anul_ret_punt_vent'
                });
                var letraId = recordAnul.getValue({
                    fieldId: 'custrecord_l54_anul_ret_letra'
                });

                var subsidiaria = null;
                var esOneWorld   = utilities.l54esOneworld();
                if (esOneWorld)
                {
                    //SUBSIDIARIA
                    subsidiaria = recordRet.getValue({
                        fieldId: 'custrecord_l54_ret_subsidiaria'
                    }); 
                }
                var numeradorArray = null;
                if (tipoRetencion == currScript.getParameter('custscript_l54_crea_anul_ret_gan'))//GANANCIAS
                {
                    var tipoTransIdGan = currScript.getParameter('custscript_l54_crea_anul_ret_gan_anul');
                    numeradorArray = devolverNuevoNumero(tipoTransIdGan, bocaId, letraId, subsidiaria, null);
                }
                if (tipoRetencion == currScript.getParameter('custscript_l54_crea_anul_ret_iva'))//IVA
                {
                    var tipoTransIdIVA = currScript.getParameter('custscript_l54_crea_anul_ret_iva_anul');
                    numeradorArray = devolverNuevoNumero(tipoTransIdIVA, bocaId, letraId, subsidiaria, null);
                }
                if (tipoRetencion == currScript.getParameter('custscript_l54_crea_anul_ret_iibb'))//INGRESOS BRUTOS
                {
                    var tipoTransIdIIBB = currScript.getParameter('custscript_l54_crea_anul_ret_iibb_anul');
                    numeradorArray = devolverNuevoNumero(tipoTransIdIIBB, bocaId, letraId, subsidiaria, jurisdiccion);
                }
                if (tipoRetencion == currScript.getParameter('custscript_l54_crea_anul_ret_suss'))//SUSS
                {
                    var tipoTransIdSUSS = currScript.getParameter('custscript_l54_crea_anul_ret_suss_anul');
                    numeradorArray = devolverNuevoNumero(tipoTransIdSUSS, bocaId, letraId, subsidiaria, null);
                }
                if (tipoRetencion == currScript.getParameter('custscript_l54_crea_anul_ret_municipal'))//Municipal
                {
                    var tipoTransIdMuni = currScript.getParameter('custscript_l54_crea_anul_ret_muni_anul');
                    numeradorArray = devolverNuevoNumero(tipoTransIdMuni, bocaId, letraId, subsidiaria, jurisdiccion);
                }

                return numeradorArray['numeradorPrefijo'];
            } catch (error) {
                log.error('afterSubmit', `Ocurrio una excepcion mientras se creaba el numerador, detalles: ${error.message}`);
            }
        }

        function devolverNuevoNumero(tipoTransId, boca, letra, subsidiaria, jurisdiccion) {

            log.audit('L54 - Calculo Retenciones', 'INICIO - devolverNuevoNumero');
            log.debug('L54 - Calculo Retenciones', 'Parámetros - tipoTransId: '+tipoTransId + ', boca: '+boca + ', letra: '+letra  + ', subsidiaria: '+subsidiaria+ ', jurisdiccion: '+jurisdiccion);
    
            if (!utilities.isEmpty(tipoTransId) && !utilities.isEmpty(boca) && !utilities.isEmpty(letra)) {
    
                var numeradorElectronico = false;
                var tipoMiddleware = 1;
                var tipoTransaccionAFIP = "";
                var idInternoNumerador = "";
               
                //SAVE SEARCH A EJECUTAR
                var saveSearch = search.load({
                    id: 'customsearch_l54_numeradores_cal_ret'
                });
                //FILTRO TIPO TRANSACCION
                if (!utilities.isEmpty(tipoTransId))
                {
                    var filtroTipoTrans = search.createFilter({
                        name: 'custrecord_l54_num_tipo_trans',
                        operator: search.Operator.ANYOF,
                        values: tipoTransId
                    });
                    saveSearch.filters.push(filtroTipoTrans);
                }
                //FILTRO BOCA
                if (!utilities.isEmpty(boca))
                {
                    var filtroBoca = search.createFilter({
                        name: 'custrecord_l54_num_boca',
                        operator: search.Operator.ANYOF,
                        values: boca
                    });
                    saveSearch.filters.push(filtroBoca);
                }
                //FILTRO LETRA
                if (!utilities.isEmpty(letra))
                {
                    var filtroLetra = search.createFilter({
                        name: 'custrecord_l54_num_letra',
                        operator: search.Operator.ANYOF,
                        values: letra
                    });
                    saveSearch.filters.push(filtroLetra);
                }
                //FILTRO SUBSIDIARIA
                if (!utilities.isEmpty(subsidiaria))
                {
                    var filtroSubsidiaria = search.createFilter({
                        name: 'custrecord_l54_num_subsidiaria',
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    saveSearch.filters.push(filtroSubsidiaria);
                }
                //FILTRO JURISDICCION
                if (!utilities.isEmpty(jurisdiccion))
                {
                    var filtroJurisdiccion = search.createFilter({
                        name: 'custrecord_l54_num_jurisdiccion',
                        operator: search.Operator.IS,
                        values: jurisdiccion
                    });
                    saveSearch.filters.push(filtroJurisdiccion);
                }
                log.debug('L54 - Filtros', JSON.stringify(saveSearch.filters));  
                var resultSearch = saveSearch.run();
                var completeResultSet = null;
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set
        
                do{
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });
        
                    if (!utilities.isEmpty(resultado) && resultado.length > 0)
                    {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;
        
                    // once no records are returned we already got all of them
                } while (!utilities.isEmpty(resultado) && resultado.length > 0)
        
                if (!utilities.isEmpty(completeResultSet))
                {
                    if (completeResultSet.length>0)
                    {
                        var numerador = completeResultSet[0].getValue({name: resultSearch.columns[1]});
                        var numeradorInicial = completeResultSet[0].getValue({name: resultSearch.columns[2]});
                        var numeradorLong = completeResultSet[0].getValue({name: resultSearch.columns[3]});
                        var numeradorPrefijo = completeResultSet[0].getValue({name: resultSearch.columns[4]});
                        numeradorElectronico = completeResultSet[0].getValue({name: resultSearch.columns[5]});
                        tipoMiddleware = completeResultSet[0].getValue({name: resultSearch.columns[6]});
                        tipoTransaccionAFIP = completeResultSet[0].getValue({name: resultSearch.columns[7]});
                        idInternoNumerador = completeResultSet[0].getValue({name: resultSearch.columns[8]});
                        var recId = completeResultSet[0].getValue({name: resultSearch.columns[8]});
                    }
                }
                else
                {
                    log.error('L54 - Calculo Retenciones', 'devolverNuevoNumero - No se encuentro informacion de numeradores con los parametros recibidos');
                    log.debug('L54 - Calculo Retenciones', 'RETURN 1');        
                    log.audit('L54 - Calculo Retenciones', 'FIN - devolverNuevoNumero');        
                    return 1;
                }  
        
                if (!utilities.isEmpty(numeradorElectronico) && (numeradorElectronico == 'T' || numeradorElectronico == true)) {
                    // Si es Numerador Electronico
                    var numeradorArray = new Array();
                    numeradorArray['referencia'] = idInternoNumerador;
                    numeradorArray['numerador'] = ""; // numerador
                    numeradorArray['numeradorPrefijo'] = ""; // prefijo + numerador
                    numeradorArray['numeradorElectronico'] = 'T';
                    numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
                    log.debug('L54 - Calculo Retenciones', 'RETURN - numeradorArray: ' +JSON.stringify(numeradorArray));
                    log.audit('L54 - Calculo Retenciones', 'FIN - devolverNuevoNumero');        
                    return numeradorArray;
                }
                else
                {
                    if (utilities.isEmpty(numerador))
                    {
                        //nlapiSubmitField('customrecord_l54_numeradores', recId, ['custrecord_l54_num_numerador'], [parseInt(numeradorInicial) + 1]);
                        var contador = parseInt(numeradorInicial) + 1;
    
                        record.submitFields({
                            type: 'customrecord_l54_numeradores',
                            id: recId,
                            values: {
                                custrecord_l54_num_numerador: contador
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields : true
                            }
                        });
                        numerador = numeradorInicial;
                    }
                    else
                    {
                        //nlapiSubmitField('customrecord_l54_numeradores', recId, ['custrecord_l54_num_numerador'], [parseInt(numerador) + 1]);
                        var contador = parseInt(numerador) + 1;
                        record.submitFields({
                            type: 'customrecord_l54_numeradores',
                            id: recId,
                            values: {
                                custrecord_l54_num_numerador: contador
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields : true
                            }
                        });
                    }
                    var numerador = zeroFill(numerador, numeradorLong);
        
                    if (!utilities.isEmpty(numeradorPrefijo))
                    {
                        var numeradorArray = new Array();
                        numeradorArray['referencia'] = idInternoNumerador;
                        numeradorArray['numerador'] = numerador.toString(); // numerador
                        numeradorArray['numeradorPrefijo'] = numeradorPrefijo.toString() + numerador.toString(); // prefijo + numerador
                        numeradorArray['numeradorElectronico'] = 'F';
                        numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
                        log.debug('L54 - Calculo Retenciones', 'RETURN - numeradorArray: ' +JSON.stringify(numeradorArray));
                        log.audit('L54 - Calculo Retenciones', 'FIN - devolverNuevoNumero');        
                        return numeradorArray;
                    } else {
        
                        var numeradorArray = new Array();
                        numeradorArray['referencia'] = idInternoNumerador;
                        numeradorArray['numerador'] = numerador.toString(); // numerador
                        numeradorArray['numeradorPrefijo'] = numerador.toString(); // prefijo + numerador
                        numeradorArray['numeradorElectronico'] = 'F';
                        numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
                        log.debug('L54 - Calculo Retenciones', 'RETURN - numeradorArray: ' +JSON.stringify(numeradorArray));
                        log.audit('L54 - Calculo Retenciones', 'FIN - devolverNuevoNumero');        
                        return numeradorArray;
                    }
                }
            } else {
                var numeradorArray = new Array();
                numeradorArray['referencia'] = idInternoNumerador;
                numeradorArray['numerador'] = ""; // numerador
                numeradorArray['numeradorPrefijo'] = ""; // prefijo + numerador
                numeradorArray['numeradorElectronico'] = 'F';
                numeradorArray['tipoTransAFIP'] = '';
                log.debug('L54 - Calculo Retenciones', 'RETURN - numeradorArray: ' +JSON.stringify(numeradorArray));
                log.audit('L54 - Calculo Retenciones', 'FIN - devolverNuevoNumero');        
                return numeradorArray;
            }
        }
        function zeroFill(number, width) {
            log.audit('L54 - Calculo Retenciones', 'INICIO - zeroFill');
            log.debug('L54 - Calculo Retenciones', 'Parámetros - number: '+ number + 'width: '+ width);
            width -= number.toString().length;
            if (width > 0) {
        
                return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
            }
    
            log.debug('L54 - Calculo Retenciones', 'RETURN - number: ' +number);
            log.audit('L54 - Calculo Retenciones', 'FIN - loadRetenciones');    
            return number;
        }
        return {
            afterSubmit: afterSubmit
        }
    }
)