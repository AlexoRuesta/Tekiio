/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NAmdConfig /SuiteScripts/L54 - configuration.json
 * @NModuleScope Public
 */

define(["N/runtime", "LIB - Search", "N/record", "N/email", "N/format"],

function (runtime, libSearch, record, email, format) {

    var proceso = "L54 - Carga Padron RG2681 (MR)";
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
            const lineNumber = parseInt(context.key, 10);
            const line = context.value; 
            
            if (lineNumber < 1) return;
            log.debug("line", line) 
            
            const cols = line.split(';').map(c => (c || '').trim());
            
            // 12024039801;30637112135;MAQUINAS Y SOLDADURAS SOCIDAD ANONIMA;2025;100;CNR GAN - Régimen Gral;01/12/2024;30/09/2025
            const cuit = cols[1];
            const porcentaje = cols[4];
            const vigDesde = cols[6];
            const vigHasta = cols[7];

            if(vigDesde != '-' && vigHasta != '-'){
                context.write({
                    key: cuit,
                    value: JSON.stringify({
                        porcentaje,
                        vigDesde,
                        vigHasta
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

            parameters.input = JSON.parse(currScript.getParameter({ name: 'custscript_l54_pad_rg830_mr_input'}));

            log.audit(proceso, 'Parámetros recibidos: ' + JSON.stringify(parameters));
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

    // ================== RETURN ==================
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
})