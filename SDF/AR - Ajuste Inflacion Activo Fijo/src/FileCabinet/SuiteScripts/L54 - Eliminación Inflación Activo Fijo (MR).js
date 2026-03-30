/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 *@NAmdConfig /SuiteScripts/L54 - configuration.json
 */
define(['N/file', 'N/runtime', 'N/email', 'N/search', 'LIB - Search v2', 'L54/utilidades', 'N/record', 'N/render'],

    function (file, runtime, email, search, libSearch, utilities, record, render) {

        const proceso = 'Inflación Activo Fijo (MR)';
        
        let { InitSearch } = libSearch;
            InitSearch = new InitSearch();

        String.prototype.lpad = function (padString, length) {
            var str = this;
            while (str.length < length)
                str = padString + str;
            return str;
        }

        function getParameters() {
            try {
                let parameters = new Object();
                let currScript = runtime.getCurrentScript();

                parameters.subsidiary = currScript.getParameter({ name: 'custscript_l54_eliminacion_axi_sub'});
                parameters.assetType = currScript.getParameter({ name: 'custscript_l54_eliminacion_axi_type'});
                parameters.input = JSON.parse(currScript.getParameter({ name: 'custscript_l54_eliminacion_axi_input'}));
                log.debug("parameters.assetType", parameters.assetType)
                parameters.assetType = parameters.assetType.split(',')

                log.audit(proceso, 'Parámetros recibidos: ' + JSON.stringify(parameters));
                return parameters;
            } catch (excepcion) {
                log.error('getParameters', 'INPUT DATA - Excepcion Obteniendo Parametros - Excepcion : ' + excepcion.message.toString());
                return null;
            }
        }

        const getInputData = () => {

            try {
                log.audit(proceso, 'GetInputData - INICIO');

                let parameters = getParameters();

                // let assetsExcludes= getAssetsExcludes(parameters.input.indexPeriods);
                // log.debug("assetsExcludes",assetsExcludes )
                    
                const filtros = buildFilters(parameters);
                let filters = filtros.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));
                log.debug("filters", filters)
                const savedSearch = InitSearch.getSavedSearch('customsearch_l54_eliminacion_historial', filters);
                
                return savedSearch;

            } catch (error) {
                log.error('GetInputData - Error', 'Error obteniendo la información del suitelet y/o busquedas:' + error);
            }
        }

        function map(context) {
            let objRta = { 'error': false, 'idClave': context.key, 'detalles_errores': [] };
            let customRecord = "customrecord_l54_audit_inflation";
            var clave = context.key;
            let mensaje = '';
            var resultado = {
                tipo: 'ELIMINACION',
                historialesEliminados: 0,
                journalsEliminados: 0,
                errores: []
            };
            try {
                

                let result = JSON.parse(context.value);
                log.debug('result', JSON.stringify(result));

                let journal = result.values['custrecord_l54_audit_inflation_journal'].value;

                log.debug('journal', journal);
                let customSearch = search.create({
                        type: customRecord,
                        filters:[
                                    ["custrecord_l54_audit_inflation_journal","anyof", journal]
                                ],
                        columns: [
                            search.createColumn({
                               name: "internalid",
                               summary: "GROUP",
                               label: "ID interno"
                            }),
                            search.createColumn({
                               name: "custrecord_l54_audit_inflation_ca",
                               summary: "GROUP",
                               label: "Costo Actual Historico"
                            }),
                            search.createColumn({
                               name: "custrecord_l54_audit_inflation_nbv",
                               summary: "GROUP",
                               label: "Valor en Libros Historico"
                            }),
                            search.createColumn({
                               name: "custbody_l54_altdepreciation",
                               join: "CUSTRECORD_L54_AUDIT_INFLATION_JOURNAL",
                               summary: "GROUP",
                               label: "AR - Depreciación Alternativa Asociada"
                            })
                         ]
                    })
                    let customResult = customSearch.run().getRange(0,100);
                    log.debug("customResult", customResult.length)
                    
                    if (customResult.length != 0) {
                        for (var i in customResult) {
                            log.debug("customResult: " + customResult[i].getValue({ name: "internalid", summary: "GROUP" }))
                            record.delete({
                                type: customRecord,
                                id: customResult[i].getValue({ name: "internalid", summary: "GROUP" })
                            });
                            resultado.historialesEliminados ++;

                            var currentCost = customResult[i].getValue({ name: "custrecord_l54_audit_inflation_ca", summary: "GROUP" });
                            var bookValue = customResult[i].getValue({ name: "custrecord_l54_audit_inflation_nbv", summary: "GROUP" });
                            var depreciation = customResult[i].getValue({ name: "custbody_l54_altdepreciation", join: "custrecord_l54_audit_inflation_journal", summary: "GROUP"});
                        }
                    }
                    log.debug("journal", journal)
                    record.delete({
                        type: "journalentry",
                        id: journal
                    });
                    resultado.journalsEliminados ++;
                    if(!utilities.isEmpty(currentCost) && !utilities.isEmpty(bookValue)){
                        let customRecord = record.load({
                            type: "customrecord_ncfar_altdepreciation",
                            id: depreciation
                        });

                        customRecord.setValue({ fieldId: "custrecord_altdepr_currentcost", value: currentCost });
                        customRecord.setValue({ fieldId: "custrecord_altdeprnbv", value: bookValue });

                        try {
                            var idTmp = customRecord.save();
                            log.debug("DeleteRecord", "SE MODIFICO LOS VALORES DE LA DEPRECIACIÓN ALTERNATIVA CORRECTAMENTE: " + idTmp);

                        }catch (e) {
                            log.error("DeleteRecord", "ERROR AL MODIFICAR LOS VALORES DE LA DEPRECIACIÓN ALTERNATIVA CORRECTAMENTE: " + e.message);
                           
                        }
                    }

                    
                context.write(clave, JSON.stringify(resultado));
               
            } catch (e) {
                log.error(proceso, 'OCURRIO UN ERROR INESPERADO - EXCEPTION DETALLES: ' + e.message);
                mensaje = 'OCURRIO UN ERROR INESPERADO - EXCEPTION DETALLES: ' + e.message;
                resultado.errores.push(mensaje);
                context.write(clave, objRta);
            }
        }

         function summarize(summary) {
            try {
               log.audit("INICIANDO SUMMARIZE", JSON.stringify(summary, null, 2));
                let parameters = getParameters();
                var estadisticas = {
                    totales: {
                        historialesEliminados: 0,
                        journalsEliminados: 0,
                        erroresTotal: 0
                    },
                    errores: [],
                    tiempoTotalMinutos: 0
                };

                // Procesar resultados del output
                summary.output.iterator().each(function(key, value) {
                    try {
                        var resultado = JSON.parse(value);
                        log.debug("resultado", resultado)
                        if (resultado.tipo === 'ELIMINACION') {
                            estadisticas.totales.historialesEliminados += resultado.historialesEliminados || 0;
                            estadisticas.totales.journalsEliminados += resultado.journalsEliminados || 0;
                            
                            if (resultado.errores && resultado.errores.length > 0) {
                                estadisticas.errores = estadisticas.errores.concat(resultado.errores.slice(0, 2));
                                estadisticas.totales.erroresTotal++;
                            }
                            
                        }

                        
                    } catch (parseError) {
                        log.error("SUMMARIZE_OUTPUT", "Error parseando resultado: " + parseError);
                    }
                    
                    return true;
                });

                var author = parameters.input.user;
                var recipients = parameters.input.user;
                // Enviar notificación final
                enviarNotificacionFinal(estadisticas, author);
            } catch (e) {
                log.error('Summarize Error', e);
            }
        }

        function enviarNotificacionFinal(estadisticas, idUsuario) {
        try {
        
            
            var subject = "Proceso Eliminación Finalizado ";
            var body = construirMensajeFinalCompleto(estadisticas);
            
            email.send({
                author: idUsuario,
                recipients: idUsuario,
                subject: subject,
                body: body
            });
            
            log.audit("ENVIANDO EMAIL", "Notificación enviada a: " + idUsuario);
            
        } catch (error) {
            log.error("EMAIL_FINAL_ERROR", "❌ Error enviando email: " + error);
        }
    }

    function construirMensajeFinalCompleto(estadisticas) {
       

        var mensaje = "PROCESO ELIMINACION COMPLETADO. ";
        if (estadisticas.totales.erroresTotal > 0)  mensaje += "CON ERRORES";
            mensaje += "\n\n";
            mensaje += "PARAMETROS SELECCIONADOS: " + "\n\n";
            
            mensaje += "RESUMEN DE RESULTADOS:\n";
            mensaje += "• Registros Historial Ajuste por Inflación eliminados: " + estadisticas.totales.historialesEliminados + "\n";
            mensaje += "• Journals eliminados: " + estadisticas.totales.journalsEliminados + "\n";
            
        if (estadisticas.totales.erroresTotal > 0) {
            mensaje += "\nERRORES ENCONTRADOS: " + estadisticas.totales.erroresTotal + "\n";
            
            if (estadisticas.errores.length > 0) {
                mensaje += "Detalle de errores principales:\n";
                estadisticas.errores.slice(0, 5).forEach(function(error, index) {
                    mensaje += "  " + (index + 1) + ". [" + (error.operacion || 'General') + "] " + error.error + "\n";
                });
                
                if (estadisticas.errores.length > 5) {
                    mensaje += "  ... y " + (estadisticas.errores.length - 5) + " errores más (revisar logs)\n";
                }
            }
        }

        mensaje += "\nEl proceso ha finalizado.";
        
        return mensaje;
    }

        function cleanData(valor) {
            const val = valor.toString().trim();
            if (val === '.00' || val === '.' || val === '') return '0.00';
            return valor;
        }

        const buildFilters = (parameters, assetsExcludes) => {
            let filtros = [];
            let arrConfiguration = parameters.input.configuration;

            if (!utilities.isEmpty(parameters.subsidiary)){
                filtros.push({
                    name: 'custrecord_assetsubsidiary',
                    join: 'custrecord_l54_audit_inflation_asset',
                    operator: 'ANYOF',
                    values: parameters.subsidiary
                });
            }else {
                let arraySub = arrConfiguration.map(obj => obj.custrecord_l54_config_ajusinf_subsid);
                filtros.push({
                    name: 'custrecord_assetsubsidiary',
                    join: 'custrecord_l54_audit_inflation_asset',
                    operator: 'ANYOF',
                    values: arraySub
                });
            }
            
            if (!utilities.isEmpty(parameters.assetType)){
                filtros.push({
                    name: 'custrecord_assettype',
                    join: 'custrecord_l54_audit_inflation_asset',
                    operator: 'ANYOF',
                    values: parameters.assetType
                });
            }
           
            // if (!utilities.isEmpty(arrConfiguration) && arrConfiguration.length > 0){
                
            //     accountingbook = arrConfiguration.map(obj => obj.custrecord_l54_config_ajusinf_libajus);
            //     accountingbook = [...new Set(accountingbook)];
            //     log.debug('accountingbook', JSON.stringify(accountingbook))

            //     filtros.push({
            //         name: 'custrecord_altdepr_accountingbook',
            //         operator: 'ANYOF',
            //         values: accountingbook
            //     });
            // }

            // if (!utilities.isEmpty(parameters.input.indexPeriods)){
            //     let indexPeriods = parameters.input.indexPeriods;
            //     log.debug('indexPeriods[indexPeriods.length - 1].startdate', indexPeriods[indexPeriods.length - 1].startdate)

            //     filtros.push({
            //         name: 'custrecord_assetpurchasedate',
            //         join: 'custrecord_altdeprasset',
            //         operator: 'ONORBEFORE',
            //         values: indexPeriods[indexPeriods.length - 1].startdate
            //     });
            // }

            // if (!utilities.isEmpty(assetsExcludes) && assetsExcludes.length > 0){
                
            //     filtros.push({
            //         name: 'internalid',
            //         join: 'custrecord_altdeprasset',
            //         operator: 'NONEOF',
            //         values: assetsExcludes
            //     });
            // }

            if (!utilities.isEmpty(parameters.input.indexPeriods)){
                let indexPeriods = parameters.input.indexPeriods;
                log.debug('indexPeriods[indexPeriods.length - 1].startdate', indexPeriods[indexPeriods.length - 1].startdate)

                filtros.push({
                    name: 'custrecord_l54_audit_inflation_date_end',
                    operator: 'ANYOF',
                    values: indexPeriods[indexPeriods.length - 1].custrecord_l54_axi_indice_mes
                });
            }
            return filtros;
        };

        // const getComparePeriods = (paramInit, paramDate) => {
        //     let date1 = paramInit,
        //     dia1  = date1.substring(0,2),
        //     mes1  = Number(date1.substring(3,5)),
        //     anio1 = Number(date1.substring(6,10)),
        //     resultDate1 = new Date(anio1,mes1,dia1);

        //     let date2 = paramDate,
        //     dia2  = date2.substring(0,2),
        //     mes2  = Number(date2.substring(3,5)),
        //     anio2 = Number(date2.substring(6,10)),
        //     resulDate2 = new Date(anio2,mes2,dia2);

        //     if(resultDate1 <= resulDate2){
        //         return true;
        //     }

        //     return false;
        // }

        const getComparePeriods = (date1, date2, operador) =>{
            if (!date1 || !date2 || date1.trim() === "" || date2.trim() === "") {
                return false;
            }
            const parseDate = (dateStr) => {
            // Reemplaza guiones por barras si es necesario
            const normalized = dateStr.replace(/-/g, '/').trim();
            const parts = normalized.split('/');
            if (parts.length !== 3) throw new Error(`Formato inválido: ${dateStr}`);
            
                // Convierte a números y asegura que tenga ceros a la izquierda si hace falta
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Mes es base 0 en JS
                const year = parseInt(parts[2], 10);
                
                return new Date(year, month, day);
            };

            let operator = {
                '<': function(a, b) { return a < b; },
                '<=': function(a, b) { return a <= b; },
                '>': function(a, b) { return a > b; },
                '>=': function(a, b) { return a >= b; },
                '==': function(a, b) { return a.getTime() == b.getTime(); },
                '!=': function(a, b) { return a.getTime() != b.getTime(); }
            };

            const resultDate1 = parseDate(date1);
            const resulDate2 = parseDate(date2);

            if (!operator[operador]) {
                throw new Error('Operador no válido: ' + operador);
            }

            return operator[operador](resultDate1, resulDate2);
        }

         const getAssetsExcludes = (rangePeriod) => {
            const idsPEriods = rangePeriod.map(obj => obj.custrecord_l54_axi_indice_mes);
            let filters = [['custrecord_l54_audit_inflation_date_ini', 'anyof', idsPEriods]
                        ];
            let columns = [
                { name: 'formulatext', formula: 'NS_CONCAT({custrecord_l54_audit_inflation_asset.internalid})', alias: 'formulatext1' , summary: 'MIN'}
            ];

            let result = InitSearch.getSearchCreated('customrecord_l54_audit_inflation', filters, columns);
            log.debug("idsPEriods", idsPEriods)
            log.debug("result", result)
            let arrayResult = (result[0].formulatext1).split(',');
            arrayResult = [...new Set(arrayResult)];
            
            return arrayResult;
        }

        const getAssetsTypes = (paramIDS) => {
            let filters = [['internalid', 'anyof', paramIDS]
                        ];
            let columns = [
                { name: 'name', alias: 'name'}
            ];

            let result = InitSearch.getSearchCreated('customrecord_ncfar_assettype', filters, columns);
            log.debug("result", result)
            if(result.length != 0){
               return result.map(item => item.name).join(", ");
            }
            return ""
        }
       
        function encodeBase64(str) {
            return Buffer.from(str, 'utf8').toString('base64');
        }

        const getFolder = () => {
        let filters = [["name", "is", "ActivoFijoArchivos"]
                    ];
        let columns = [
            { name: 'internalid', alias: 'ID' }
        ];

        let array = InitSearch.getSearchCreated('folder', filters, columns);
        
        let folderID;
        if (!array || array.length === 0) {
            const newFolder = record.create({ type: "folder" });
            newFolder.setValue("name", "ActivoFijoArchivos");
            folderID = newFolder.save();
        } else {
            folderID = array[0].ID;
        }
        return folderID;
    }

        return {
            getInputData: getInputData,
            map: map,
            // reduce: reduce,
            summarize: summarize
        }
    });