/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NAmdConfig /SuiteScripts/L54 - configuration.json
 * @NModuleScope Public
 */

define(["N/runtime", "LIB - Search", "N/record", "N/email", "N/format"],

function (runtime, libSearch, record, email, format) {

    var proceso = "L54 - Carga Padron de Embargo (MR)";
    let { InitSearch } = libSearch;
        InitSearch = new InitSearch();
    
    function getInputData() {
        log.audit("INICIO - MAP/REDUCE", "INICIO - MAP/REDUCE");
        
        try {
            let parameters = getParameters();
            log.debug("parameters", JSON.stringify(parameters));

            return { type: 'file', id: parameters.input.archivo };
        } catch (error) {
            log.error(proceso, "❌ Error en getInputData: " + error);
            enviarEmailError("Error en preparación de datos: " + error, parameters);
            throw error;
        }
    }

    function map(context) {
        try {
            var parameters = getParameters(),
                arrayVendors = [],
                arrayCustomers = [];
            
            const lineNumber = parseInt(context.key, 10);
            
            if (lineNumber < 1) {

            }

            const line = context.value; 
            
            log.debug("line", line) 
            
            // 20250501200011797570000001429630BUENO VICENTE CANDIDO                                                                                                   
            const fecha = line.substring(0, 6);
            const cuit = line.substring(8, 19);
            const montoStr = line.substring(19, 32);
            const razonSocial = line.substring(32).trim();
            const monto = parseFloat((parseInt(montoStr, 10) / 100).toFixed(2));
            
            let searchVendors = InitSearch.getSearchCreated(
                'vendor', 
                [
                    ['isinactive', 'is', 'F'],
                    "AND",
                    ["custentity_l54_cuit_entity", "is", cuit]
                ], 
                [
                    { name: 'internalid', alias: 'ID' }
                ]
            );

            for (var i = 0; i < searchVendors.length; i++) {
                let entidad = searchVendors[i];
                arrayVendors.push(entidad.ID);
            }
            
            // let searchCustomer = InitSearch.getSearchCreated(
            //     'customer', 
            //     [
            //         ['isinactive', 'is', 'F'],
            //         "AND",
            //         ["custentity_l54_cuit_entity", "is", cuit]
            //     ], 
            //     [
            //         { name: 'internalid', alias: 'ID' }
            //     ]
            // );

            // for (var i = 0; i < searchCustomer.length; i++) {
            //     let entidad = searchCustomer[i];
            //     arrayCustomers.push(entidad.ID);
            // }
            
            if(fecha.length != 0 && cuit.length != 0 && monto > 0 && fecha ==  parameters.input.periodoFormatEmbargos && arrayCustomers.length > 0){
                context.write({
                    key: cuit,
                    value: JSON.stringify({
                        fecha: fecha,
                        cuit: cuit,
                        monto: monto,
                        vendors: arrayVendors,
                        customers: arrayCustomers
                    })
                });
            }
                
            
        } catch (e) {
            log.error("MAP_ERROR", "❌ Error procesando " + context.key + ": " + error);
            context.write("ERROR_MAP_" + Date.now(), JSON.stringify({
                error: true,
                mensaje: error,
                result: line,
                timestamp: new Date().toISOString()
            }));
        }
    }

    function reduce(context) {
        try {
            const cuit = context.key;
            const values = context.values.map(v => JSON.parse(v));
            var resultado = {
                    cuit: cuit,
                    tipo: 'ENTIDADES_PROCESADAS',
                    entidadesModificadas: 0,
                    errores: []
                };
                
            log.audit('REDUCE', { cuit, count: values.length, sample: JSON.stringify(values) });

            if(values.length != 0){
                const certificado = values[0]; 

                let searchVendors = InitSearch.getSearchCreated(
                    'vendor', 
                    [
                        ['isinactive', 'is', 'F'],
                        "AND",
                        ["custentity_l54_cuit_entity", "is", cuit]
                    ], 
                    [
                        { name: 'internalid', alias: 'ID' }
                    ]
                );

                if (searchVendors.length > 0) {
                    const vigDesdeDate = parseDate(certificado.vigDesde);
                    const vigHastaDate = parseDate(certificado.vigHasta);

                    const vigDesdeNS = format.format({
                        value: vigDesdeDate,
                        type: format.Type.DATE
                    });
                    const vigHastaNS = format.format({
                        value: vigHastaDate,
                        type: format.Type.DATE
                    });

                    for (var i = 0; i < searchVendors.length; i++) {
                        var entidad = searchVendors[i];
                        
                        try { 
                            record.submitFields.promise({
                                type: record.Type.VENDOR, 
                                id: entidad.ID,
                                values: {
                                    custentity_l54_fecha_inicio_exencion: vigDesdeNS,
                                    custentity_l54_fecha_caducidad_gan: vigHastaNS,
                                    custentity_l54_porcentaje_excl : certificado.porcentaje
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true,
                                    disableTriggers: true 
                                }
                            });
                        } catch (error) {
                            resultado.errores.push({
                                entidad: entidad.ID,
                                error: error.toString()
                            });
                        }
                        resultado.entidadesModificadas++;
                    }
                    
                    context.write(cuit, JSON.stringify(resultado));
                } 
            }

        } catch (e) {
            log.error("REDUCE_ERROR", JSON.stringify(valores));
            log.error("REDUCE_ERROR", "Error en reduce " + clave + ": " + error);
            context.write("ERROR_REDUCE_" + clave, JSON.stringify({
                error: true,
                mensaje: error.toString(),
                clave: clave,
                timestamp: new Date().toISOString()
            }));
        }
    }

    function summarize(summary) {
        try {
            log.audit("INICIANDO SUMMARIZE", JSON.stringify(summary, null, 2));

            var estadisticas = {
                    totales: {
                        entidadesModificadas: 0,
                        cuitsProcesados: 0,
                        erroresTotal: 0
                    },
                    errores: [],
                    tiempoTotalMinutos: 0
                };

            summary.output.iterator().each(function(key, value) {
                try {
                    var resultado = JSON.parse(value);
                    
                    if (resultado.tipo === 'ENTIDADES_PROCESADAS') {
                        estadisticas.totales.cuitsProcesados++;
                        estadisticas.totales.entidadesModificadas += resultado.entidadesModificadas || 0;
                        
                        if (resultado.errores && resultado.errores.length > 0) {
                            estadisticas.errores = estadisticas.errores.concat(resultado.errores.slice(0, 2));
                            estadisticas.totales.erroresTotal++;
                        }
                        
                    }else if(key.indexOf('ERROR_REDUCE') === 0 ){
                        estadisticas.errores = estadisticas.errores.concat({
                            clave: resultado.clave,
                            mensaje: resultado.mensaje
                        });
                        estadisticas.totales.erroresTotal++;
                    } 
                } catch (parseError) {
                    log.error("SUMMARIZE_OUTPUT", "Error parseando resultado: " + parseError);
                }
                
                return true;
            });

            // Enviar notificación final
            enviarNotificacionFinal(estadisticas);
            log.audit("SUMMARIZE_FINAL", "Proceso completado: " + JSON.stringify(estadisticas));
        }catch (error) {
            log.error("SUMMARIZE_ERROR", "❌ Error en summarize: " + error);
            enviarEmailError("Error en consolidación final: " + error);
        }
        
    }

    function getParameters() {
        try {
            let parameters = new Object();
            let currScript = runtime.getCurrentScript();

            parameters.input = JSON.parse(currScript.getParameter({ name: 'custscript_l54_carga_padron_em_mr_input'}));

            return parameters;
        } catch (excepcion) {
            log.error('getParameters', 'INPUT DATA - Excepcion Obteniendo Parametros - Excepcion : ' + excepcion.message.toString());
            return null;
        }
    }

    function parseDate(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;
        const [day, month, year] = parts;
        return new Date(year, month - 1, day);
    }

    function enviarNotificacionFinal(estadisticas) {
        try {
            const parameters = getParameters();

            var subject = "Proceso Carga de Padrones RG830 - Completado ";
            var body = construirMensajeFinalCompleto(estadisticas, parameters);
            
            email.send({
                author: parameters.input.user,
                recipients: parameters.input.user,
                subject: subject,
                body: body
            });
            
        } catch (error) {
            log.error("EMAIL_FINAL_ERROR", "❌ Error enviando email: " + error);
        }
    }

    function construirMensajeFinalCompleto(estadisticas, parameters) {
        log.debug("parameters", JSON.stringify(parameters))

        var mensaje = "PROCESO CARGA DE PADRONES COMPLETADO ";
        if (estadisticas.totales.erroresTotal > 0)  mensaje += "CON ERRORES";
            mensaje += "\n\n";
            mensaje += "INFORMACIÓN DEL PROCESO: " + "\n";
            mensaje += "• DOCUMENTO CONSULTADO EN NETSUITE: " + parameters.input.fileName + "\n";
            mensaje += "• ENTIDADES MODIFICADAS: " + estadisticas.totales.entidadesModificadas + "\n";
            mensaje += "• CUITS PROCESADOS: " + estadisticas.totales.cuitsProcesados + "\n\n";
            
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

    function enviarEmailError(mensaje, informacion) {
        try {
            const parameters = getParameters();
            
            email.send({
                author: parameters.input.user,
                recipients: parameters.input.user,
                subject: "Error en Proceso de Carga de Padrones RG2681",
                body: "Se ha producido un error en el proceso de carga de padrón:\n\n" + mensaje + 
                      "\n\nPor favor revise los logs para más detalles."
            });
        } catch (error) {
            log.error("EMAIL_ERROR", "Error enviando email de error: " + error);
        }
    }

    function getTodayDDMMYYYY() {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // enero es 0
        const yyyy = today.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    function buscarRegistrosJurisdiccion(parametros) {
        try {
            let eliminados = 0,
                errores = [],
                filtros = [];
            
            if (!parametros.jurisdiccion) {
                return { eliminados: 0, errores: [] };
            }
            filtros.push({
                name: "custrecord_l54_jurisdicciones_iibb_jur",
                operator: "IS",
                values: parametros.jurisdiccion
            });

            // if (parametros.aplicaClientes && !parametros.aplicaProveedores) {
            //     filtros.push({
            //         name: "custrecord_l54_jurisdicciones_iibb_cli",
            //         operator: "NONEOF",
            //         values: "@NONE@"
            //     });
            //     filtros.push({
            //         name: "custrecord_l54_jurisdicciones_iibb_prov",
            //         operator: "ANYOF",
            //         values: "@NONE@"
            //     });
            // } else if (!parametros.aplicaClientes && parametros.aplicaProveedores) {
            //     filtros.push({
            //         name: "custrecord_l54_jurisdicciones_iibb_cli",
            //         operator: "ANYOF",
            //         values: "@NONE@"
            //     });
            //     filtros.push({
            //         name: "custrecord_l54_jurisdicciones_iibb_prov",
            //         operator: "NONEOF",
            //         values: "@NONE@"
            //     });
            // }

            let filters = filtros.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));
            const registros = InitSearch.getResultSearch("customsearch_l54_jur_iibb_eliminar", filters, ['cuit', 'id_interno', 'idEntidad']);
            
            return registros.map(function(registro) {
                return {
                    id: registro.id_interno,
                    cuit: registro.cuit,
                    idEntidad: registro.idEntidad,
                    tipo: "customrecord_l54_jurisdicciones_iibb"
                };
            });
            
        } catch (error) {
            log.error("ELIMINAR_JURISDICCION_ERROR", error);
            return { eliminados: 0, errores: [{ error: error }] };
        }
    }

    function buscarRegistrosPadron(parametros) {
        try {
            let filtros = [];
            
            filtros.push({
                name: "custrecord_l54_pv_jc_tipo_padron",
                operator: "IS",
                values: parametros.idTipoPadron
            });
            
            if (!utilities.isEmpty(parametros.subsidiaria)) {
                filtros.push({
                    name: "custrecord_l54_pv_jc_subsidiaria",
                    operator: "ANYOF",
                    values: parametros.subsidiaria
                });
            }

            // if (parametros.aplicaClientes && !parametros.aplicaProveedores) {
            //     filtros.push({
            //         name: "custrecord_l54_pv_jc_cliente",
            //         operator: "NONEOF",
            //         values: "@NONE@"
            //     });
            //     filtros.push({
            //         name: "custrecord_l54_pv_jc_proveedor",
            //         operator: "ANYOF",
            //         values: "@NONE@"
            //     });
            // } else if (!parametros.aplicaClientes && parametros.aplicaProveedores) {
            //     filtros.push({
            //         name: "custrecord_l54_pv_jc_cliente",
            //         operator: "ANYOF",
            //         values: "@NONE@"
            //     });
            //     filtros.push({
            //         name: "custrecord_l54_pv_jc_proveedor",
            //         operator: "NONEOF",
            //         values: "@NONE@"
            //     });s
            // }

            let filters = filtros.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));
            const registros = InitSearch.getResultSearch("customsearch_l54_iibb_eliminar_padron", filters, 
                ['cuit', 'id_registro', 'period_id', 'period_date', 'subsidiary', 'entity_id']);
            
            // Aplicar lógica de filtrado pero sin eliminar
            var registrosAEliminar = [];
            
            for (var i = 0; i < registros.length; i++) {
                var registro = registros[i];
                
                idsParaEliminar = (registro.id_registro).split(",")
                
                idsParaEliminar.forEach(function(id) {
                    if (registro.period_date != parametros.periodoPrevio){
                        registrosAEliminar.push({
                            id: id,
                            cuit: registro.cuit,
                            idEntidad: '',
                            tipo: "customrecord_l54_pv_iibb_jur_cliente"
                        });
                    }
                    
                });
               
            }
    
            return registrosAEliminar;
        } catch (error) {
            log.error("ELIMINAR_PADRON_ERROR", error);
            return { eliminados: 0, errores: [{ error: error }] };
        }
    }

    // ================== RETURN ==================
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
})