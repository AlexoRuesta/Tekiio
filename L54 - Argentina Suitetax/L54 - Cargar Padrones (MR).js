/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NAmdConfig /SuiteScripts/L54 - configuration.json
 * @NModuleScope Public
 */

define(["N/runtime", "L54 - utilidades", "LIB - Search", "N/record", "N/email", "N/plugin", "N/http", "N/xml"],

function (runtime, utilities, libSearch, record, email, plugin, http, xml) {

    var proceso = "L54 - Carga Padron (MR)";
    let { InitSearch } = libSearch;
        InitSearch = new InitSearch();
    
    function getInputData() {
        log.audit("INICIO - MAP/REDUCE", "INICIO - MAP/REDUCE");
        var startTime = Date.now();
        
        try {
            var parameters = getParams();
            log.audit("PARAMETROS", JSON.stringify(parameters));
            
            if (utilities.isEmpty(parameters.padron)) {
                throw new Error("No se recibió parámetro de tipo padrón");
            }

            if((parameters.OneWorldAcc && !utilities.isEmpty(parameters.subsidiary)) || !parameters.OneWorldAcc){
                
                var configuracion = getConfiguration(parameters);

                if (!configuracion.success) {
                    throw new Error("❌ " + configuracion.error);
                }

                let  tipoConsultaPadron = {},
                    arrayCuitClientes = [],
                    arrayCuitProveedores = [],  
                    finalElements = [];

                var tiposContrib = getRecordTipoContrib(),
                    codRetenciones = getRecordParametrizacionRetenciones(parameters),
                    codImpuestos = getTaxCodes(parameters);

                var infoPadron = InitSearch.getSearchLookField(
                    "customrecord_l54_tipo_padron",
                    parameters.padron,
                    ["custrecord_l54_tipo_padron_codigo", "custrecord_l54_tipo_padron_ob_ti_co_ent", "custrecord_l54_tipo_padron_jurisdiccion"]
                );

                var codigoTipoPadron = infoPadron.custrecord_l54_tipo_padron_codigo || parameters.padron;
                var obtTipoInscripDesdeEntidad = convertToBoolean(infoPadron.custrecord_l54_tipo_padron_ob_ti_co_ent);
                parameters.jurisdiccion = infoPadron.custrecord_l54_tipo_padron_jurisdiccion[0].value;
                var busquedaTotal = (parameters.consultaNuevos === "F" || parameters.consultaNuevos == false || utilities.isEmpty(parameters.consultaNuevos)) ? true : false;

                if (parameters.tipoConsultaPadron) {
                    tipoConsultaPadron = InitSearch.getSearchLookField(
                        "customrecord_l54_tipo_consulta_padron",
                        parameters.tipoConsultaPadron,
                        ["custrecord_l54_tipo_consulta_padron_perc", "custrecord_l54_tipo_consulta_padron_rete"]
                    );
                }

                var aplicaProveedores = (tipoConsultaPadron.custrecord_l54_tipo_consulta_padron_rete ? true : false);
                var aplicaClientes = (tipoConsultaPadron.custrecord_l54_tipo_consulta_padron_perc ? true : false);

                if (aplicaClientes){
                    var arrayIIBBEntidadJurisdiccionClientes = "";
                    if (!busquedaTotal) {
                        arrayIIBBEntidadJurisdiccionClientes = getRecordIIBBEntidadJurisdicción(parameters, true);
                    }
                    var arrayClientes = procesarArraysCuit(true, arrayIIBBEntidadJurisdiccionClientes);

                    if(parameters.automatico && !busquedaTotal){
                        var arrEntitys = getEntitysPadron(true);
                        arrayClientes = arrayClientes.concat(arrEntitys);
                        arrayClientes = [...new Set(arrayClientes)];
                    }
                    
                    var arrayCuitClientesAux = getCuits(configuracion.id_savedSearch_clientes, parameters, true, arrayClientes, busquedaTotal);
                    arrayCuitClientes = unificarDataPadronesEntidades(arrayCuitClientesAux, parameters.padron, busquedaTotal);
                }

                if (aplicaProveedores) {
                    var arrayIIBBEntidadJurisdiccionProveedores = "";
                    if (!busquedaTotal) {
                        arrayIIBBEntidadJurisdiccionProveedores = getRecordIIBBEntidadJurisdicción(parameters, false);
                    }
                    
                    var arrayProveedores = procesarArraysCuit(false, arrayIIBBEntidadJurisdiccionProveedores);

                    if(parameters.automatico && !busquedaTotal){
                        var arrEntitys = getEntitysPadron(false);
                        arrayProveedores = arrayProveedores.concat(arrEntitys);
                        arrayProveedores = [...new Set(arrayProveedores)];
                    }
                    
                    var arrayCuitProveedoresAux = getCuits(configuracion.id_savedSearch_proveedores, parameters, false, arrayProveedores, busquedaTotal);
                    arrayCuitProveedores = unificarDataPadronesEntidades(arrayCuitProveedoresAux, parameters.padron, busquedaTotal);
                }

                var arrayCUITS = arrayCuitClientes.concat(arrayCuitProveedores);
                var arrayAuxCuits = arrayCuitClientes.concat(arrayCuitProveedores);
               
                log.audit("ENTIDADES TOTALES", "Clientes por Sub: " + arrayCuitClientes.length + 
                         ", Proveedores por Sub: " + arrayCuitProveedores.length);

                var periodoData = getAccountingPeriod(parameters.periodo);

                var arrayCUITSSimple = arrayCUITS.reduce(function(a,b){return a.concat([b.cuit])}, []);

                // Preparar eliminaciones
                var eliminaciones = getObjectDelete(parameters, aplicaClientes, aplicaProveedores, busquedaTotal, periodoData);
                finalElements = finalElements.concat(eliminaciones);

                // Preparar consultas middleware por lotes
                if (arrayCUITSSimple.length > 0) {
                    var consultasMiddleware = getConsultMiddleware(
                        arrayCUITSSimple, 
                        configuracion, 
                        parameters, 
                        arrayCuitClientes, 
                        arrayCuitProveedores,
                        arrayAuxCuits,
                        tiposContrib,
                        codRetenciones,
                        codImpuestos,
                        codigoTipoPadron,
                        obtTipoInscripDesdeEntidad,
                        periodoData.periodoFormat,
                        periodoData.periodoFormatEmbargos,
                        parameters.padron
                    );
                    finalElements = finalElements.concat(consultasMiddleware);
                }

                var endTime = Date.now();
                log.audit(proceso, "✅ INPUT completado - Elementos: " + finalElements.length + 
                         " - Tiempo: " + ((endTime - startTime) / 1000) + "s - Governance: " + runtime.getCurrentScript().getRemainingUsage());
                
                return finalElements;
            } else {
                throw new Error("❌ Debe completar la subsidiaria");
            }

        } catch (error) {
            log.error(proceso, "❌ Error en getInputData: " + error);
            enviarEmailError("Error en preparación de datos: " + error, parameters);
            throw error;
        }
    }

    function map(context) {
        
        try {
            var result = JSON.parse(context.value);
            var typeConsult = result.tipo;

            switch (typeConsult) {
                case 'CONSULTA_MIDDLEWARE':
                    var resultado = consultarYDistribuirCuits(result, context);
                    break;
                    
                case 'ELIMINACION':
                    var resultado = buscarYDistribuirEliminaciones(result, context);
                    break;
                case 'MARCAR_ENTIDADES_SIN_PADRON':
                    // Procesar entidades sin padrón directamente
                    procesarEntidadesSinPadron(result, context);
                    break;
                    
                // case 'ACTUALIZACION_ENTIDADES':
                //     var resultado = procesarActualizacionEntidadesOptimizada(result);
                //     context.write("ENTIDADES_" + result.tipoEntidad, JSON.stringify(resultado));
                //     break;
            }

        } catch (error) {
            log.error("MAP_ERROR", "❌ Error procesando " + context.key + ": " + error);
            context.write("ERROR_MAP_" + Date.now(), JSON.stringify({
                error: true,
                mensaje: error,
                result: result,
                timestamp: new Date().toISOString()
            }));
        }
    }

    /**
     * ===== REDUCE FUNCTION =====
     * Consolida resultados
     */
    function reduce(context) {
        try {
            var startTime = Date.now();
            var clave = context.key;
            var valores = context.values.map(function(v) { return JSON.parse(v); });
            // Solo procesar claves CUIT_
            if (clave.indexOf('CUIT_') !== 0) {
                log.error("CLAVE_NO_CUIT", "Clave no esperada: " + clave);
                return;
            }
            if (clave.indexOf('CUIT_') === 0){
                var cuit = clave.replace('CUIT_', '');
            
                // Consolidar todas las operaciones para este CUIT
                var operacionesConsolidadas = consolidarOperacionesPorCuit(cuit, valores);
                
                var resultado = {
                    cuit: cuit,
                    tipo: 'CUIT_PROCESADO',
                    padronesCreados: 0,
                    inscripcionesCreadas: 0,
                    entidadesMarcadas: 0,
                    registrosEliminados: 0,
                    registrosActualizados: 0,
                    errores: []
                };
                
                // 1. ELIMINAR registros existentes si hay eliminaciones pendientes
                if (operacionesConsolidadas.eliminar.length > 0) {
                    var resultadoEliminacion = ejecutarEliminacionesPorCuit(operacionesConsolidadas);
                    
                    resultado.registrosEliminados = resultadoEliminacion.eliminados;
                    resultado.errores = resultado.errores.concat(resultadoEliminacion.errores);
                }
                
                // 2. CREAR nuevos registros de padrón
                if (operacionesConsolidadas.crear.length > 0) {
                    var resultadoCreacion = crearRegistrosPadronCuitUnificado(operacionesConsolidadas.crear, operacionesConsolidadas.entidadesExentas, operacionesConsolidadas.entidadesExentasJurisdiccion);
                    resultado.padronesCreados = resultadoCreacion.padronesCreados;
                    resultado.inscripcionesCreadas = resultadoCreacion.inscripcionesCreadas;
                    resultado.errores = resultado.errores.concat(resultadoCreacion.errores);
                }
                
                // 3. MARCAR entidades sin padrón
                if (operacionesConsolidadas.marcarEntidades.length > 0) {
                    var resultadoMarcado = marcarEntidadesCuitUnificado(operacionesConsolidadas.marcarEntidades);
                    resultado.entidadesMarcadas = resultadoMarcado.marcadas;
                    resultado.errores = resultado.errores.concat(resultadoMarcado.errores);
                }
            }else{
                // Nueva lógica para marcar entidades sin padrón
                var resultado = {
                    tipo: 'ENTIDADES_MARCADAS_SIN_PADRON',
                    entidadesMarcadas: 0,
                    errores: []
                };
                
                valores.forEach(function(valor) {
                    if (valor.tipo === 'MARCAR_ENTIDADES') {
                        var resultadoMarcado = marcarEntidadesBatch(valor.entidades);
                        resultado.entidadesMarcadas += resultadoMarcado.marcadas;
                        resultado.errores = resultado.errores.concat(resultadoMarcado.errores);
                    }
                });
    
            }
                        
            var endTime = Date.now();
            // diferencia en milisegundos
            var diffMs = endTime - startTime;

            // diferencia en segundos
            var diffSec = diffMs / 1000;
            log.audit("Tiempo invertido", diffSec)
            context.write(clave, JSON.stringify(resultado));
            
        } catch (error) {
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

    /**
     * ===== SUMMARIZE FUNCTION =====
     * Consolidación final y notificaciones
     */
    function summarize(summary) {
        var startTime = Date.now();
        
        try {
            log.audit("INICIANDO SUMMARIZE", JSON.stringify(summary, null, 2));
            
            var estadisticas = {
                totales: {
                    padronesCreados: 0,
                    inscripcionesCreadas: 0,
                    entidadesMarcadas: 0,
                    erroresTotal: 0,
                    registrosEliminados: 0,
                    cuitsProcesados: 0
                },
                errores: [],
                tiempoTotalMinutos: 0
            };

            // Procesar resultados del output
            summary.output.iterator().each(function(key, value) {
                try {
                    var resultado = JSON.parse(value);
                    
                    if (key.indexOf('CUIT_') === 0 && resultado.tipo === 'CUIT_PROCESADO') {
                        estadisticas.totales.cuitsProcesados++;
                        estadisticas.totales.padronesCreados += resultado.padronesCreados || 0;
                        estadisticas.totales.inscripcionesCreadas += resultado.inscripcionesCreadas || 0;
                        estadisticas.totales.entidadesMarcadas += resultado.entidadesMarcadas || 0;
                        estadisticas.totales.registrosEliminados += resultado.registrosEliminados || 0;
                        
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

            // Procesar errores de las fases
            procesarErroresSummary(summary, estadisticas);

            // Enviar notificación final
            enviarNotificacionFinal(estadisticas);
            
            var endTime = Date.now();
            estadisticas.tiempoTotalMinutos = ((endTime - startTime) / 1000 / 60).toFixed(2);
            log.audit("SUMMARIZE_FINAL", "Proceso completado: " + JSON.stringify(estadisticas));

        } catch (error) {
            log.error("SUMMARIZE_ERROR", "❌ Error en summarize: " + error);
            enviarEmailError("Error en consolidación final: " + error);
        }
    }

    function consolidarOperacionesPorCuit(cuit, valores) {
        var consolidado = {
            cuit: cuit,
            crear: [],
            actualizar: [],
            eliminar: [],
            marcarEntidades: [],
            entidadesExentas: [],
            entidadesExentasJurisdiccion: []
        };
        
        valores.forEach(function(valor) {
            switch(valor.tipo) {
                case 'PROCESAR_CUIT_CON_PADRON':
                    // Agregar a la lista de creación
                    consolidado.crear.push(valor);
                    break;
                    
                case 'PROCESAR_CUIT_SIN_PADRON':
                    // Agregar a la lista de marcado
                    consolidado.marcarEntidades.push(valor);
                    break;
                    
                case 'ELIMINAR_REGISTROS':
                    // Agregar registros a eliminar
                    if (valor.registrosEliminar && valor.registrosEliminar.length > 0) {
                        consolidado.eliminar = consolidado.eliminar.concat(valor.registrosEliminar);
                    }
                    break;

                case 'ENTIDADES_EXENTAS':
                    if (valor.entidadesExentas && valor.entidadesExentas.length > 0) {
                        consolidado.entidadesExentas = consolidado.entidadesExentas.concat(valor.entidadesExentas);
                    }
                    break;
                case 'ENTIDADES_EXENTAS_JURISDICCION':
                    if (valor.entidadesExentas && valor.entidadesExentas.length > 0) {
                        consolidado.entidadesExentasJurisdiccion = consolidado.entidadesExentasJurisdiccion.concat(valor.entidadesExentas);
                    }
                    break;
                default:
                    log.error("TIPO_DESCONOCIDO", "Tipo de operación desconocido: " + valor.tipo);
            }
        });
        
        // Eliminar duplicados en las eliminaciones
        var idsEliminados = new Set();
        consolidado.eliminar = consolidado.eliminar.filter(function(registro) {
            if (idsEliminados.has(registro.id)) {
                return false;
            }
            idsEliminados.add(registro.id);
            return true;
        });

        // Eliminar duplicados en exenciones
        var idsExentos = new Set();
        consolidado.entidadesExentas = consolidado.entidadesExentas.filter(function(exencion) {
            if (idsExentos.has(exencion.idEntidad)) {
                return false;
            }
            idsExentos.add(exencion.idEntidad);
            return true;
        });
        
        return consolidado;
    }

    function procesarEntidadesSinPadron(trabajo, context) {
        try {
            var entidades = trabajo.entidades;
            
            // Agrupar por algún criterio (por ejemplo, por subsidiaria o en lotes)
            var LOTE_SIZE = 100; // Procesar de a 100 entidades
            
            for (var i = 0; i < entidades.length; i += LOTE_SIZE) {
                var lote = entidades.slice(i, i + LOTE_SIZE);
                
                // Agrupar por tipo para optimizar el procesamiento
                var porTipo = {
                    clientes: lote.filter(e => e.esCliente),
                    proveedores: lote.filter(e => !e.esCliente)
                };
                
                context.write("MARCAR_SIN_PADRON_" + i, JSON.stringify({
                    tipo: 'MARCAR_ENTIDADES',
                    entidades: lote
                }));
            }
            
            log.audit("ENTIDADES_SIN_PADRON_DISTRIBUIDAS", {
                total: entidades.length,
                lotes: Math.ceil(entidades.length / LOTE_SIZE)
            });
            
        } catch (error) {
            log.error("ERROR_PROCESAR_SIN_PADRON", error);
            context.write("ERROR_SIN_PADRON", JSON.stringify({
                error: true,
                mensaje: error.toString()
            }));
        }
    }

    function ejecutarEliminacionesPorCuit(registrosConsolidados) {
        let registrosEliminar = registrosConsolidados.eliminar;
        let registrosCrear= registrosConsolidados.crear;
        var eliminados = 0;
        var errores = [],
            idsProveedorUnicos = [],
            idsClienteUnicos = [];
        
        let busquedaTotal = registrosEliminar?.[0]?.parametros?.hasOwnProperty("busquedaTotal") 
        ? registrosEliminar[0].parametros.busquedaTotal === true 
        : false;

        if(!busquedaTotal && registrosCrear?.length) {
        
            idsProveedorUnicos = [...new Set(registrosCrear[0].entidades.map(e => e.idProveedor).filter(Boolean))];
            idsClienteUnicos = [...new Set(registrosCrear[0].entidades.map(e => e.idCliente).filter(Boolean))];
            idsProveedorUnicos = idsProveedorUnicos.concat(idsClienteUnicos)
        }
        log.debug("ELIMINANDO REGISTROS", "REGISTROS: " +  JSON.stringify(registrosEliminar));

        try {
            registrosEliminar.forEach(function(registro) {
               if (registro.tipo == "customrecord_l54_jurisdicciones_iibb" && !busquedaTotal && !idsProveedorUnicos.includes(registro.idEntidad)) {
                return;
               }
                try {
                    record.delete({
                        type: registro.tipo,
                        id: registro.id
                    });
                    
                    eliminados++;
                    
                } catch (errorEliminacion) {
                    errores.push({
                        operacion: 'eliminar',
                        id: registro.id,
                        tipo: registro.tipo,
                        error: errorEliminacion.toString(),
                        timestamp: new Date().toISOString()
                    });
                }
            });
            
        } catch (error) {
            errores.push({
                operacion: 'eliminar',
                error: error.toString(),
                timestamp: new Date().toISOString()
            });
        }
        
        return {
            eliminados: eliminados,
            errores: errores
        };
    }

    function crearRegistrosPadronCuitUnificado(datosCreacion, entidadesExentas, jurisdiccionesExcentas) {
        var padronesCreados = 0;
        var inscripcionesCreadas = 0;
        var errores = [];
        
        // Crear Set de IDs de entidades exentas para búsqueda rápida
        const padronExcento = [...new Set(entidadesExentas.map(e => e.idEntidad).filter(Boolean))];
        
        const padronExcentoJurisdiccion = [...new Set(jurisdiccionesExcentas.map(e => e.idEntidad).filter(Boolean))];
        
        datosCreacion.forEach(function(dataCuit) {
            try {
                var resultado = crearRegistrosPadronCuitIndividual(dataCuit, padronExcento, padronExcentoJurisdiccion);
                padronesCreados += resultado.padronesCreados;
                inscripcionesCreadas += resultado.inscripcionesCreadas;
                errores = errores.concat(resultado.errores);
            } catch (error) {
                errores.push({
                    operacion: 'crear',
                    cuit: dataCuit.cuit,
                    error: error.toString(),
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        return {
            padronesCreados: padronesCreados,
            inscripcionesCreadas: inscripcionesCreadas,
            errores: errores
        };
    }

    function marcarEntidadesCuitUnificado(datosMarcado) {
        var marcadas = 0;
        var errores = [];
        
        datosMarcado.forEach(function(dataCuit) {
            try {
                var resultado = marcarEntidadesCuitIndividual(dataCuit);
                marcadas += resultado.marcadas;
                errores = errores.concat(resultado.errores);
            } catch (error) {
                errores.push({
                    operacion: 'marcar',
                    cuit: dataCuit.cuit,
                    error: error.toString(),
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        return {
            marcadas: marcadas,
            errores: errores
        };
    }

    function marcarEntidadesBatch(entidades) {
        var marcadas = 0;
        var errores = [];
        
        entidades.forEach(function(entidad) {
            try {
                record.submitFields.promise({
                    type: entidad.tipo,
                    id: entidad.id,
                    values: {
                        custentity_l54_padron_cargado: true
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true,
                        disableTriggers: true
                    }
                });
                
                marcadas++;
                
            } catch (error) {
                errores.push({
                    entidad: entidad.id,
                    tipo: entidad.tipo,
                    error: error.toString()
                });
            }
        });
        
        return {
            marcadas: marcadas,
            errores: errores
        };
    }

    function getConfiguration(parameters) {
        try {
            
            let filters = [];
            if (!utilities.isEmpty(parameters.subsidiary)) {
                filters.push(
                    InitSearch.getFilter("custrecord_l54_conf_padron_subsidiaria", null, "ANYOF", parameters.subsidiary)
                );
            }

            const resultados = InitSearch.getResultSearch("customsearch_l54_conf_padron", filters, 
                [
                'urlMiddleware', 
                'carpeta', 
                'id_savedSearch_clientes', 
                'id_savedSearch_proveedores',
                'numero_cuenta', 
                'user_account', 
                'password_account', 
                'urlMiddlewarePadronEmbargo' //DIS
            ]);
            
            if (resultados.length === 0) {
                return {
                    success: false,
                    error: "No se encontró registros en el record: Configuración Padrón"
                };
            }

            const config = resultados[0];
            log.debug("CONFIG", "Configuración obtenida: " + JSON.stringify(config));
            
            return {
                success: true,
                ...config
            };
            
        } catch (error) {
            return {
                success: false,
                error: "Error obteniendo configuración: " + error
            };
        }
    }

    function getRecordTipoContrib() {
        try {
            const tiposContrib = InitSearch.getResultSearch("customsearch_l54_padron_iibb_det_tipo_c", [], ['id', 'tipoPadron', 'subTipoPadron', 'codigo']);
            
            return tiposContrib;
        } catch (error) {
            log.error("TIPOS_CONTRIB_ERROR", error);
            return [];
        }
    }

    function getRecordParametrizacionRetenciones(parameters) {
        try {
            let filters = [];
            if (!utilities.isEmpty(parameters.subsidiary)) {
                filters.push(InitSearch.getFilter("custrecord_l54_param_ret_subsidiaria", null, "ANYOF", parameters.subsidiary));
            }
            
            filters.push(InitSearch.getFilter("custrecord_l54_param_ret_tipo_padron", null, "IS", parameters.padron));

            const codRetenciones = InitSearch.getResultSearch("customsearch_l54_cod_param_retenciones", filters, ['id', 'nombre', 'subTipoPadron', 'idInternoSubTipo', 'idSubsidiaria']);
            
            // Procesar idSubsidiaria como array
            codRetenciones.forEach(function(codigo) {
                if (codigo.idSubsidiaria) {
                    codigo.idSubsidiaria = codigo.idSubsidiaria.split(",");
                }
            });

            return codRetenciones;
            
        } catch (error) {
            log.error("COD_RETENCIONES_ERROR", error);
            return [];
        }
    }

    function buscarYDistribuirEliminaciones(trabajo, context) {
        try {
            var startTime = Date.now();
            // Buscar registros a eliminar
            var resultadoBusqueda = procesarEliminacion(trabajo);
            
            if (!resultadoBusqueda.success) {
                log.error("BUSQUEDA_ERROR", "Error buscando " + trabajo.subTipo + ": " + resultadoBusqueda.error);
                return;
            }

            if (trabajo.subTipo === 'exencion' && resultadoBusqueda.entidadesExentas.length > 0) {
                var exencionPorCuit = {};
                
                resultadoBusqueda.entidadesExentas.forEach(function(exencion) {
                    if (!exencionPorCuit[exencion.cuit]) {
                        exencionPorCuit[exencion.cuit] = {
                            tipo: 'ENTIDADES_EXENTAS',
                            cuit: exencion.cuit,
                            entidadesExentas: []
                        };
                    }
                    
                    exencionPorCuit[exencion.cuit].entidadesExentas.push({
                        idEntidad: exencion.idEntidad
                    });
                });
                
                // Escribir exenciones por CUIT
                Object.keys(exencionPorCuit).forEach(function(cuit) {
                    context.write("CUIT_" + cuit, JSON.stringify(exencionPorCuit[cuit]));
                });
                
                return;
            }

            if (trabajo.subTipo === 'exencion_jurisdiccion' && resultadoBusqueda.entidadesExentas.length > 0) {
                var exencionPorCuit = {};
                
                resultadoBusqueda.entidadesExentas.forEach(function(exencion) {
                    if (!exencionPorCuit[exencion.cuit]) {
                        exencionPorCuit[exencion.cuit] = {
                            tipo: 'ENTIDADES_EXENTAS_JURISDICCION',
                            cuit: exencion.cuit,
                            entidadesExentas: []
                        };
                    }
                    
                    exencionPorCuit[exencion.cuit].entidadesExentas.push({
                        idEntidad: exencion.idEntidad
                    });
                });
                
                // Escribir exenciones por CUIT
                Object.keys(exencionPorCuit).forEach(function(cuit) {
                    context.write("CUIT_" + cuit, JSON.stringify(exencionPorCuit[cuit]));
                });
                
                return;
            }

            var registros = resultadoBusqueda.registros || [];
            
            if (registros.length === 0) {
                log.audit("SIN REGISTROS", "No hay registros para eliminar en: " + trabajo.subTipo);
                return;
            }
            
            // Agrupa registros por CUIT
            var registrosPorCuit = {};
            
            registros.forEach(function(registro) {
                if (!registro.cuit) {
                    log.error("REGISTRO_SIN_CUIT", "Registro sin CUIT: " + JSON.stringify(registro));
                    return;
                }
                
                if (!registrosPorCuit[registro.cuit]) {
                    registrosPorCuit[registro.cuit] = {
                        tipo: 'ELIMINAR_REGISTROS',
                        cuit: registro.cuit,
                        registrosEliminar: [],
                        parametros: trabajo.parametros,
                        subTipo: trabajo.subTipo
                    };
                }
                
                registrosPorCuit[registro.cuit].registrosEliminar.push({
                    id: registro.id,
                    tipo: registro.tipo,
                    subTipo: trabajo.subTipo,
                    parametros: trabajo.parametros,
                    idEntidad: registro.idEntidad,
                });
            });
            
            var endTime = Date.now();
            // diferencia en milisegundos
            var diffMs = endTime - startTime;

            // diferencia en segundos
            var diffSec = diffMs / 1000;
            log.audit("Tiempo invertido buscarYDistribuirEliminaciones", diffSec)

            // Escribir al reduce con la misma estructura que el middleware: CUIT_xxxx
            Object.keys(registrosPorCuit).forEach(function(cuit) {
                
                context.write("CUIT_" + cuit, JSON.stringify(registrosPorCuit[cuit]));
            });
            
            
        } catch (error) {
            log.error("ERROR EN LA FUNCIÓN buscarYDistribuirEliminaciones", "Error distribuyendo " + trabajo.subTipo + ": " + error);
            context.write("ERROR_ELIMINACION_" + trabajo.subTipo, JSON.stringify({
                error: true,
                subTipo: trabajo.subTipo,
                mensaje: error.toString()
            }));
        }
    }

    function getTaxCodes(parameters) {
        try {
            let filters = [];
            
            filters.push(InitSearch.getFilter("custrecord_l54_tipo_padron", null, "IS", parameters.padron));

            const codImpuestos = InitSearch.getResultSearch("customsearch_l54_padron_cod_imp", filters, ['id', 'nombre', 'subTipoPadron', 'idInternoSubTipo']);
            
            return codImpuestos;
            
        } catch (error) {
            log.error("COD_IMPUESTOS_ERROR", error);
            return [];
        }
    }

    function getRecordIIBBEntidadJurisdicción(parameters, consultarClientes) {
        try {
            let filtros = [];

            // Filtro subsidiaria
            if (!utilities.isEmpty(parameters.subsidiary)) {
                filtros.push({
                    name: "custrecord_l54_pv_jc_subsidiaria",
                    operator: "ANYOF",
                    values: parameters.subsidiary
                });
            }

            // Filtros según tipo de entidad
            if (consultarClientes) {
                filtros.push({
                    name: "formulatext",
                    operator: "ISNOTEMPTY",
                    formula: "{custrecord_l54_pv_jc_cliente}"
                });
                filtros.push({
                    name: "formulatext",
                    operator: "ISEMPTY",
                    formula: "{custrecord_l54_pv_jc_proveedor}"
                });
            } else {
                filtros.push({
                    name: "formulatext",
                    operator: "ISEMPTY",
                    formula: "{custrecord_l54_pv_jc_cliente}"
                });
                filtros.push({
                    name: "formulatext",
                    operator: "ISNOTEMPTY",
                    formula: "{custrecord_l54_pv_jc_proveedor}"
                });
            }

            // Filtro padrón
            if (!utilities.isEmpty(parameters.padron)) {
                filtros.push({
                    name: "custrecord_l54_pv_jc_tipo_padron",
                    operator: "ANYOF",
                    values: parameters.padron
                });
            }

            let filters = filtros.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));

            const resultados = InitSearch.getResultSearch("customsearch_l54_iibb_ent_jurisd_padron", filters, ['cuit', 'padronesPorEntidad', 'campo2', 'idInternoClientes', 'idInternoProveedores']);
            
            return resultados;
        } catch (error) {
            log.error("IIBB_ENTIDAD_ERROR", error);
            return [];
        }
    }

    function getEntitysPadron(flagClientes) {
        try {
            const searchId = flagClientes ? "customsearch_l54_clientes_padron_cargado" : "customsearch_l54_prov_padron_cargado";
            
            const resultados = InitSearch.getResultSearch(searchId, [], ['internalid']);

            const arrResult = resultados.map(function(resultado) {
                return resultado.internalid;
            });
            
            return arrResult;
        } catch (error) {
            log.error("ENTITIES_PADRON_ERROR", error);
            return [];
        }
    }

    function getAccountingPeriod(idPeriodo) {
        try {
            var periodoData = {
                periodoFormat: "",
                periodoFormatEmbargos: "",
                periodoPrevio: ""
            };
            let filtros = [];

            if (!utilities.isEmpty(idPeriodo)) {
                filtros.push({
                    name: "internalid",
                    operator: "IS",
                    values: idPeriodo
                });
                
                let filters = filtros.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));
                
                const resultados = InitSearch.getResultSearch("customsearch_l54_period_carga_padron", filters, ['internalid', 'periodname', 'startdate', 'periodformat', 'formatembargos']);//DIS
                
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
                
                
            }

            return periodoData;
        } catch (error) {
            log.error("PERIODO_ERROR", error);
            return { periodoFormat: "", periodoFormatEmbargos: "" };
        }
    }

    function getCuits(id_SS_customer, parameters, consultarClientes, arrayResultados, busquedaTotal) {
        try {
            // ===== CONFIGURACIÓN OPTIMIZADA PARA GETINPUTDATA =====
            const CONFIG = {
                MAX_EXECUTION_TIME: 3600000,    // 60 minutos (getInputData tiene más tiempo)
                OPTIMAL_BATCH_SIZE: 10000,      // Lotes grandes pero seguros
                MIN_BATCH_SIZE: 5000,           // Mínimo viable
                MAX_RETRIES: 3,                 // Reintentos por lote
                TIMEOUT_PER_CALL: 300000,       // 5 minutos por llamada
                MIN_GOVERNANCE_RESERVE: 1000    // Reserva de governance
            };

            // ===== PARÁMETROS BASE OPTIMIZADOS =====
            const baseParams = {
                id_SS: id_SS_customer,
                idSubsidiary: JSON.stringify(parameters.subsidiary),
                idPadron: parameters.padron,
                consultarClientes: consultarClientes,
                busquedatotal: busquedaTotal,
                arrayResultados: JSON.stringify(arrayResultados)
            };
            
            const headers = {
                'Accept': '*/*',
                'Content-Type': 'application/json'
            };

            // ===== VARIABLES DE CONTROL =====
            let allResults = [];
            let resultIndex = 0;
            let loteNumero = 1;
            let currentBatchSize = CONFIG.OPTIMAL_BATCH_SIZE;
            let hasMoreData = true;
            let consecutiveErrors = 0;
            let totalEstimado = null;

            while (hasMoreData) {
              
                const resultadoLote = ejecutarLoteConControlTotal(
                    baseParams,
                    headers,
                    resultIndex,
                    currentBatchSize,
                    loteNumero,
                    CONFIG
                );

                // ===== PROCESAR RESULTADO DEL LOTE =====
                if (!resultadoLote.success) {
                    consecutiveErrors++;
                    
                    if (consecutiveErrors >= 3) {
                        log.error("ERRORES_CRITICOS", "Demasiados errores consecutivos, abortando");
                        break;
                    }
                    
                    // Reducir batch size y reintentar
                    currentBatchSize = Math.max(CONFIG.MIN_BATCH_SIZE, Math.floor(currentBatchSize * 0.6));
                    resultIndex += currentBatchSize; // Saltar este lote problemático
                    loteNumero++;
                    continue;
                }

                // ===== CONSOLIDAR RESULTADOS =====
                const registrosLote = resultadoLote.datos;
                consecutiveErrors = 0; // Reset en éxito

                if (registrosLote.length === 0) {
                    log.audit("FIN_REGISTROS", "No hay más registros disponibles");
                    hasMoreData = false;
                    break;
                }

                allResults = allResults.concat(registrosLote);
                resultIndex += currentBatchSize;
                loteNumero++;

                // Verificar si es el último lote
                if (registrosLote.length < currentBatchSize * 0.8) {
                    hasMoreData = false;
                }
            }

            return allResults;
        } catch (error) {
            log.error("OBTENER_CUIT_ERROR", error);
            return [];
        }
    }

    function ejecutarLoteConControlTotal(baseParams, headers, resultIndex, batchSize, loteNumero, CONFIG) {
        let intentos = 0;
        
        while (intentos < CONFIG.MAX_RETRIES) {
            try {
                const inicioLlamada = Date.now();
                
                const parametrosLote = Object.assign({}, baseParams, {
                    resultIndex: resultIndex,
                    resultQuantity: batchSize,
                    contador: loteNumero
                });

                log.debug("INVOCANDO AL RESTLEL LOTE", {
                    lote: loteNumero,
                    intento: intentos + 1,
                    rango: `${resultIndex}-${resultIndex + batchSize}`,
                    batchSize: batchSize
                });

                // const respuesta = https.requestRestlet({
                //     scriptId: 'customscript_l54_busqueda_aux_cuit_rl',
                //     deploymentId: 'customdeploy_l54_busqueda_aux_cuit_rl',
                //     method: https.Method.POST,
                //     body: JSON.stringify(parametrosLote),
                //     headers: headers
                // });

                var customPlugin = plugin.loadImplementation({
                    type: 'customscript_l54_tipo_bus_cuit',
                    implementation: 'customscript_l54_imp_bus_cuit'
                });

                let respuesta = customPlugin.busquedaCuit(
                    parametrosLote
                );

                const finLlamada = Date.now();
                const duracionLlamada = finLlamada - inicioLlamada;
                
                if (!utilities.isEmpty(respuesta)) {
                    
                    const data = respuesta.respuesta;
                    if (data && data.length > 0) {
                        //const registros = data[0].respuesta[0] || [];
                        
                        log.audit("LOTE EXITOSO", {
                            registrosObtenidos: data.length,
                            sonClientes: baseParams.consultarClientes
                        });
                        
                        return {
                            success: true,
                            datos: data
                        };
                    } 
                } else {
                    log.error("ERROR EN EL LOTE POR HTTPS", {
                        httpCode: respuesta?.code || "Sin respuesta",
                        intento: intentos + 1
                    });
                }

            } catch (error) {
                log.error("ERROR EN LA FUNCION ejecutarLoteConControlTotal", {
                    intento: intentos + 1,
                    error: error
                });
            }
            
            intentos++;
            
        }
        
        return {
            success: false,
            datos: [],
            duracion: 0,
            error: `Falló después de ${CONFIG.MAX_RETRIES} intentos`
        };
    }

    function getObjectDelete(parameters, aplicaClientes, aplicaProveedores, busquedaTotal, periodoData) {
        var elementos = [];
        
        if (busquedaTotal) {
            
            // Preparar búsqueda de exención (sin eliminar)
            elementos.push({
                tipo: 'ELIMINACION',
                id: 'eliminacion_exencion',
                subTipo: 'exencion',
                parametros: {
                    idTipoPadron: parameters.padron,
                    subsidiaria: parameters.subsidiary,
                    aplicaClientes: aplicaClientes,
                    aplicaProveedores: aplicaProveedores
                }
            });

            // Preparar búsqueda de padrón general (sin eliminar)
            elementos.push({
                tipo: 'ELIMINACION',
                id: 'eliminacion_padron',
                subTipo: 'padron',
                parametros: {
                    idTipoPadron: parameters.padron,
                    subsidiaria: parameters.subsidiary,
                    aplicaClientes: aplicaClientes,
                    aplicaProveedores: aplicaProveedores,
                    periodo: parameters.periodo,
                    periodoPrevio: periodoData.periodoPrevio
                }
            });
            
        }
        // Preparar búsqueda de jurisdicción (sin eliminar)
        elementos.push({
            tipo: 'ELIMINACION',
            id: 'eliminacion_jurisdiccion',
            subTipo: 'jurisdiccion',
            parametros: {
                idTipoPadron: parameters.padron,
                subsidiaria: parameters.subsidiary,
                jurisdiccion: parameters.jurisdiccion,
                aplicaClientes: aplicaClientes,
                aplicaProveedores: aplicaProveedores,
                busquedaTotal: busquedaTotal
            }
        });

        elementos.push({
                tipo: 'ELIMINACION',
                id: 'eliminacion_exencion_jurisdiccion',
                subTipo: 'exencion_jurisdiccion',
                parametros: {
                    idTipoPadron: parameters.padron,
                    subsidiaria: parameters.subsidiary,
                    jurisdiccion: parameters.jurisdiccion,
                    aplicaClientes: aplicaClientes,
                    aplicaProveedores: aplicaProveedores
                }
        });
        return elementos;
    }

    function consultarYDistribuirCuits(trabajo, context) {
        try {
            var startTime = Date.now();
            log.debug("DISTRIBUIR CUITS", "Lote " + trabajo.loteId + " - CUITs: " + trabajo.cuits.length);
            
            var configuracion = trabajo.configuracion;
            var informacion = trabajo.informacion;
            var datosContexto = trabajo.datosContexto;
            
            var respuestaMiddleware;
            respuestaMiddleware = consultarMiddlewarePadron(trabajo.cuits, configuracion, informacion, datosContexto);
            
            if (!respuestaMiddleware.success) {
                log.error("MIDDLEWARE_ERROR", "Error en lote " + trabajo.loteId + ": " + respuestaMiddleware.error);
                return { success: false, error: respuestaMiddleware.error };
            }
            
            // 2. Procesar respuesta (misma lógica actual)
            var padronesEncontrados = respuestaMiddleware.data;
            
            var padronesEnriquecidos = setEstadoInscripcion(padronesEncontrados, trabajo, datosContexto);
            
            var cuitsEncontrados = padronesEnriquecidos.map(function(padron) {
                return padron.cuit;
            });
            
            var cuitsNoEncontrados = trabajo.cuits.filter(function(cuit) {
                return cuitsEncontrados.indexOf(cuit) === -1;
            });
           cuitsNoEncontrados = [...new Set(cuitsNoEncontrados)];
           
            var cuitsProcesados = 0;
            datosContexto.tiposContrib = [];

            var padronesGroupedByCuit = agruparPadronesPorCuit(padronesEnriquecidos);
            
            Object.keys(padronesGroupedByCuit).forEach(function(cuit) {
                var entidadesParaCUIT = encontrarEntidadesParaCUIT(cuit, trabajo.entidadesRelacionadas);
                
                if (entidadesParaCUIT.length > 0) {
                    context.write("CUIT_" + cuit, JSON.stringify({
                        tipo: 'PROCESAR_CUIT_CON_PADRON',
                        cuit: cuit,
                        padrones: padronesGroupedByCuit[cuit],
                        entidades: entidadesParaCUIT,
                        datosContexto: datosContexto,
                        informacion: informacion,
                        loteOrigen: trabajo.loteId
                    }));
                    cuitsProcesados++;
                }
            });
            
            // 3b. Distribuir CUITs SIN padrón encontrado
            cuitsNoEncontrados.forEach(function(cuit) {
                var entidadesParaCUIT = extraerEntidadesSinPadron(cuit, trabajo.entidadesRelacionadas);
                
                if (entidadesParaCUIT.length > 0) {
                    context.write("CUIT_" + cuit, JSON.stringify({
                        tipo: 'PROCESAR_CUIT_SIN_PADRON',
                        cuit: cuit,
                        entidades: entidadesParaCUIT
                    }));
                    cuitsProcesados++;
                }
            });
            var endTime = Date.now();
            // diferencia en milisegundos
            var diffMs = endTime - startTime;

            // diferencia en segundos
            var diffSec = diffMs / 1000;
            log.audit("Tiempo invertido consultarYDistribuirCuits", diffSec)
            
        } catch (error) {
            log.error("CONSULTAR_DISTRIBUIR_ERROR", "Error en lote " + trabajo.loteId + ": " + error);
            return { 
                success: false, 
                error: error,
                loteId: trabajo.loteId 
            };
        }
    }

    function agruparPadronesPorCuit(padrones) {
        var grouped = {};
        
        padrones.forEach(function(padron) {
            if (!grouped[padron.cuit]) {
                grouped[padron.cuit] = [];
            }
            grouped[padron.cuit].push(padron);
        });
        
        return grouped;
    }

    function procesarEliminacion(trabajo) {
        try {
            
            var parametros = trabajo.parametros;
            var registrosParaEliminar = [];
            var entidadesExentas = [];
            
            switch (trabajo.subTipo) {
                case 'exencion':
                    entidadesExentas = buscarRegistrosExencion(parametros);
                    
                    return {
                        success: true,
                        subTipo: trabajo.subTipo,
                        registrosEncontrados: 0,
                        registros: [], // No hay registros para eliminar
                        entidadesExentas: entidadesExentas // Devolver las entidades exentas
                    };

                case 'exencion_jurisdiccion':
                    entidadesExentas = buscarRegistrosExencionJurisdiccion(parametros);
                    
                    return {
                        success: true,
                        subTipo: trabajo.subTipo,
                        registrosEncontrados: 0,
                        registros: [], // No hay registros para eliminar
                        entidadesExentas: entidadesExentas // Devolver las entidades exentas
                };
                    
                case 'padron':
                    registrosParaEliminar = buscarRegistrosPadron(parametros);
                    break;
                    
                case 'jurisdiccion':
                    registrosParaEliminar = buscarRegistrosJurisdiccion(parametros);
                    break;
            }
            
            log.audit("REGISTROS ENCONTRADOS DE TIPO " + trabajo.subTipo, registrosParaEliminar.length + " registros");
            
            return {
                success: true,
                subTipo: trabajo.subTipo,
                registrosEncontrados: registrosParaEliminar.length,
                registros: registrosParaEliminar
            };
            
        } catch (error) {
            log.error("BUSCAR_ELIMINACION_ERROR", "Error en " + trabajo.subTipo + ": " + error);
            return {
                success: false,
                subTipo: trabajo.subTipo,
                error: error
            };
        }
    }

    function buscarRegistrosExencion(parametros) {
        try {
            let eliminados = 0,
                errores = [],
                filtros = [];

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

            if (parametros.aplicaClientes && !parametros.aplicaProveedores) {
                filtros.push({
                    name: "custrecord_l54_pv_jc_cliente",
                    operator: "NONEOF",
                    values: "@NONE@"
                });
                filtros.push({
                    name: "custrecord_l54_pv_jc_proveedor",
                    operator: "ANYOF",
                    values: "@NONE@"
                });
            } else if (!parametros.aplicaClientes && parametros.aplicaProveedores) {
                filtros.push({
                    name: "custrecord_l54_pv_jc_cliente",
                    operator: "ANYOF",
                    values: "@NONE@"
                });
                filtros.push({
                    name: "custrecord_l54_pv_jc_proveedor",
                    operator: "NONEOF",
                    values: "@NONE@"
                });
            }

             let filters = filtros.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));
            const registros = InitSearch.getResultSearch("customsearch_l54_iibb_exencion_padron", filters, ['cuit', 'id_registro']);
            
            var registrosAEliminar = [];
            for (var i = 0; i < registros.length; i++) {
                var registro = registros[i];
                
                idsParaEliminar = (registro.id_registro).split(",")
                
                idsParaEliminar.forEach(function(id) {
                   registrosAEliminar.push({
                        idEntidad: id,
                        cuit: registro.cuit,
                        tipoExencion: 'exencion'
                    });
                });
            }
            
            return registrosAEliminar;
        } catch (error) {
            log.error("ELIMINAR_EXENCION_ERROR", error);
            return { eliminados: 0, errores: [{ error: error }] };
        }
    }

    function buscarRegistrosExencionJurisdiccion(parametros) {
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

            if (parametros.aplicaClientes && !parametros.aplicaProveedores) {
                filtros.push({
                    name: "custrecord_l54_jurisdicciones_iibb_cli",
                    operator: "NONEOF",
                    values: "@NONE@"
                });
                filtros.push({
                    name: "custrecord_l54_jurisdicciones_iibb_prov",
                    operator: "ANYOF",
                    values: "@NONE@"
                });
            } else if (!parametros.aplicaClientes && parametros.aplicaProveedores) {
                filtros.push({
                    name: "custrecord_l54_jurisdicciones_iibb_cli",
                    operator: "ANYOF",
                    values: "@NONE@"
                });
                filtros.push({
                    name: "custrecord_l54_jurisdicciones_iibb_prov",
                    operator: "NONEOF",
                    values: "@NONE@"
                });
            }

             let filters = filtros.map(n => InitSearch.getFilter(n.name, n.join, n.operator, n.values, n.formula));
            const registros = InitSearch.getResultSearch("customsearch_l54_jur_iibb_exencion", filters, ['cuit', 'id_registro']);
            
            var registrosAEliminar = [];
            for (var i = 0; i < registros.length; i++) {
                var registro = registros[i];
                
                idsParaEliminar = (registro.id_registro).split(",")
                
                idsParaEliminar.forEach(function(id) {
                   registrosAEliminar.push({
                        idEntidad: id,
                        cuit: registro.cuit,
                        tipoExencion: 'exencion_jurisdiccion'
                    });
                });
            }
    
            return registrosAEliminar;
        } catch (error) {
            log.error("ELIMINAR_EXENCION_ERROR", error);
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

            if (parametros.aplicaClientes && !parametros.aplicaProveedores) {
                filtros.push({
                    name: "custrecord_l54_pv_jc_cliente",
                    operator: "NONEOF",
                    values: "@NONE@"
                });
                filtros.push({
                    name: "custrecord_l54_pv_jc_proveedor",
                    operator: "ANYOF",
                    values: "@NONE@"
                });
            } else if (!parametros.aplicaClientes && parametros.aplicaProveedores) {
                filtros.push({
                    name: "custrecord_l54_pv_jc_cliente",
                    operator: "ANYOF",
                    values: "@NONE@"
                });
                filtros.push({
                    name: "custrecord_l54_pv_jc_proveedor",
                    operator: "NONEOF",
                    values: "@NONE@"
                });
            }

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

            if (parametros.aplicaClientes && !parametros.aplicaProveedores) {
                filtros.push({
                    name: "custrecord_l54_jurisdicciones_iibb_cli",
                    operator: "NONEOF",
                    values: "@NONE@"
                });
                filtros.push({
                    name: "custrecord_l54_jurisdicciones_iibb_prov",
                    operator: "ANYOF",
                    values: "@NONE@"
                });
            } else if (!parametros.aplicaClientes && parametros.aplicaProveedores) {
                filtros.push({
                    name: "custrecord_l54_jurisdicciones_iibb_cli",
                    operator: "ANYOF",
                    values: "@NONE@"
                });
                filtros.push({
                    name: "custrecord_l54_jurisdicciones_iibb_prov",
                    operator: "NONEOF",
                    values: "@NONE@"
                });
            }

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

    function getConsultMiddleware(arrayCUITS, configuracion, parameters, arrayCuitClientes, arrayCuitProveedores, arrayAuxCuits, tiposContrib, codRetenciones, codImpuestos, codigoTipoPadron, obtTipoInscripDesdeEntidad, periodoFormat, periodoFormatEmbargos, idTipoPadron) {
        var elementos = [];
        var LOTE_SIZE = 800;
        
        // Crear un Set con todos los CUITs que vamos a procesar para búsqueda rápida
        var cuitsAProcesar = new Set(arrayCUITS);
        
        // Arrays para almacenar entidades sin CUIT en padrón
        var clientesSinPadron = [];
        var proveedoresSinPadron = [];
        
        // Crear índices para búsqueda eficiente por CUIT
        var indiceClientes = crearIndicePorCuit(arrayCuitClientes);
        var indiceProveedores = crearIndicePorCuit(arrayCuitProveedores);
        var indiceAuxCuits = crearIndicePorCuit(arrayAuxCuits);
        
        // Procesar por lotes
        for (var i = 0; i < arrayCUITS.length; i += LOTE_SIZE) {
            var loteCUITS = arrayCUITS.slice(i, i + LOTE_SIZE);
            
            // Filtrar solo las entidades que corresponden a este lote de CUITs
            var clientesLote = [];
            var proveedoresLote = [];
            var auxCuitsLote = [];
            
            // Usar Set para búsqueda O(1)
            var cuitsLoteSet = new Set(loteCUITS);
            
            // Filtrar clientes para este lote
            loteCUITS.forEach(function(cuit) {
                if (indiceClientes[cuit]) {
                    clientesLote = clientesLote.concat(indiceClientes[cuit]);
                }
                if (indiceProveedores[cuit]) {
                    proveedoresLote = proveedoresLote.concat(indiceProveedores[cuit]);
                }
                if (indiceAuxCuits[cuit]) {
                    auxCuitsLote = auxCuitsLote.concat(indiceAuxCuits[cuit]);
                }
            });
            
            elementos.push({
                tipo: 'CONSULTA_MIDDLEWARE',
                id: 'consulta_lote_' + Math.floor(i / LOTE_SIZE + 1),
                loteId: Math.floor(i / LOTE_SIZE + 1),
                cuits: loteCUITS,
                configuracion: configuracion,
                informacion: parameters,
                entidadesRelacionadas: {
                    clientes: clientesLote,        // Solo clientes con CUITs de este lote
                    proveedores: proveedoresLote,   // Solo proveedores con CUITs de este lote
                    auxCuits: auxCuitsLote          // Solo auxCuits de este lote
                },
                datosContexto: {
                    tiposContrib: tiposContrib,
                    codRetenciones: codRetenciones,
                    codImpuestos: codImpuestos,
                    codigoTipoPadron: codigoTipoPadron,
                    obtTipoInscripDesdeEntidad: obtTipoInscripDesdeEntidad,
                    periodoFormat: periodoFormat,
                    periodoFormatEmbargos: periodoFormatEmbargos,
                    idTipoPadron: idTipoPadron
                }
            });
        }
        
        // Identificar entidades con CUITs que NO están en arrayCUITS (no tienen padrón)
        var entidadesSinPadron = identificarEntidadesSinPadron(
            arrayCuitClientes, 
            arrayCuitProveedores, 
            cuitsAProcesar
        );
        
        // Agregar elemento para procesar entidades sin padrón
        if (entidadesSinPadron.length > 0) {
            elementos.push({
                tipo: 'MARCAR_ENTIDADES_SIN_PADRON',
                id: 'marcar_sin_padron',
                entidades: entidadesSinPadron
            });
        }
        
        log.audit("CONSULTAS_PREPARADAS", {
            lotesMiddleware: elementos.filter(e => e.tipo === 'CONSULTA_MIDDLEWARE').length,
            cuitsTotal: arrayCUITS.length,
            entidadesSinPadron: entidadesSinPadron.length
        });
        
        return elementos;
    }

    function crearIndicePorCuit(arrayEntidades) {
        var indice = {};
        
        arrayEntidades.forEach(function(entidad) {
            if (!indice[entidad.cuit]) {
                indice[entidad.cuit] = [];
            }
            indice[entidad.cuit].push(entidad);
        });
        
        return indice;
    }

    function identificarEntidadesSinPadron(arrayCuitClientes, arrayCuitProveedores, cuitsConPadron) {
        var entidadesSinPadron = [];
        var entidadesProcesadas = new Set(); // Para evitar duplicados
        
        // Procesar clientes
        arrayCuitClientes.forEach(function(cliente) {
            if (!cuitsConPadron.has(cliente.cuit)) {
                // Este CUIT no está en el padrón
                var ids = cliente.id.split(',');
                ids.forEach(function(id) {
                    var clave = 'C_' + id.trim() + '_' + cliente.subsidiaria;
                    if (!entidadesProcesadas.has(clave)) {
                        entidadesProcesadas.add(clave);
                        entidadesSinPadron.push({
                            id: id.trim(),
                            tipo: 'customer',
                            esCliente: true,
                            cuit: cliente.cuit,
                            subsidiaria: cliente.subsidiaria
                        });
                    }
                });
            }
        });
        
        // Procesar proveedores
        arrayCuitProveedores.forEach(function(proveedor) {
            if (!cuitsConPadron.has(proveedor.cuit)) {
                // Este CUIT no está en el padrón
                var ids = proveedor.id.split(',');
                ids.forEach(function(id) {
                    var clave = 'V_' + id.trim() + '_' + proveedor.subsidiaria;
                    if (!entidadesProcesadas.has(clave)) {
                        entidadesProcesadas.add(clave);
                        entidadesSinPadron.push({
                            id: id.trim(),
                            tipo: 'vendor',
                            esCliente: false,
                            cuit: proveedor.cuit,
                            subsidiaria: proveedor.subsidiaria
                        });
                    }
                });
            }
        });
        
        return entidadesSinPadron;
    }

    function consultarMiddlewarePadron(cuits, configuracion, informacion, datosContexto) {
        try {
            var jsonBody = {
                usuario: configuracion.user_account,
                password: configuracion.password_account,
                cuenta: configuracion.numero_cuenta,
                idTipoPadron: datosContexto.codigoTipoPadron,
                subsidiaria: informacion.subsidiary[0],
                cuits: cuits.toString(),
                fechaDesdeNS: datosContexto.periodoFormat || ""
            };
            
            var xmlPost = construirXMLRequest(jsonBody);
            
            return ejecutarLlamadaHTTPConReintentos(xmlPost, configuracion.urlMiddleware, informacion.limitMax);
            
        } catch (error) {
            return {
                success: false,
                error: "Error preparando consulta padrón: " + error
            };
        }
    }

    function ejecutarLlamadaHTTPConReintentos(xmlPost, url, maxIntentos) {
        var tiemposEspera = [2000, 5000, 10000];
        
        for (var intento = 0; intento < maxIntentos; intento++) {
            try {
                log.debug("CONEXION AL SERVIDOR", "🔄 Intento " + (intento + 1) + "/" + maxIntentos);
                
                var response = http.post({
                    url: url,
                    body: xmlPost,
                    headers: {
                        "Content-Type": "text/xml",
                        "Content-Length": "length"
                    },
                    timeout: 60000
                });

                if (response.code === 200) {
                    return parsearRespuestaXML(response.body);
                }
                
            } catch (error) {
                log.error("HTTP_ERROR", "❌ Intento " + (intento + 1) + " falló: " + error);
                
                if (intento === maxIntentos - 1) {
                    return {
                        success: false,
                        error: "Máximo número de intentos alcanzado: " + error
                    };
                }
                
                // Simular espera
                var esperaMs = tiemposEspera[intento];
                for (var i = 0; i < esperaMs * 100; i++) {
                    Math.random();
                }
            }
        }
        
        return {
            success: false,
            error: "Error desconocido en llamadas HTTP"
        };
    }
    
    // ================== FUNCIONES DE PROCESAMIENTO DE PADRONES ==================

    function setEstadoInscripcion(padrones, trabajo, datosContexto) {
        try {
            var padronesEnriquecidos = [];
            
            for (var i = 0; i < padrones.length; i++) {
                var padron = padrones[i];
                var padronEnriquecido = Object.assign({}, padron);
                
                // Enriquecer con tipo de contribuyente
                var arrayContrib = datosContexto.tiposContrib.filter(function(obj) {
                    return (obj.tipoPadron == datosContexto.codigoTipoPadron && 
                            obj.subTipoPadron == padron.subTipoPadron && 
                            obj.codigo == padron.codContrib);
                });
                padronEnriquecido.idContrib = (arrayContrib.length > 0) ? arrayContrib[0].id : "";
                
                if (datosContexto.obtTipoInscripDesdeEntidad && trabajo.entidadesRelacionadas.auxCuits.length > 0) {
                    var arrayCuitTipoContrib = trabajo.entidadesRelacionadas.auxCuits.filter(function(obj) {
                        return (obj.cuit == padron.cuit);
                    });
                    padronEnriquecido.idContrib = (arrayCuitTipoContrib.length > 0) ? arrayCuitTipoContrib[0].idContrib : "";
                }
                
                delete padronEnriquecido.codContrib;
                
                // Agregar jurisdicción
                padronEnriquecido.jurisdiccion = trabajo.informacion.jurisdiccion;
                
                padronesEnriquecidos.push(padronEnriquecido);
            }
            
            return padronesEnriquecidos;
            
        } catch (error) {
            log.error("ENRIQUECER_ERROR", "❌ Error enriqueciendo padrones: " + error);
            return padrones; // Retornar padrones originales si hay error
        }
    }

    function marcarEntidadesCuitIndividual(dataCuit) {
        var marcadas = 0;
        var errores = [];
        var MIN_GOVERNANCE = 30; // Reserva mínima por operación
        
        try {
            log.debug("MARCANDO ENTIDADES SIN PADRON", JSON.stringify(dataCuit.entidades));
            
            var entidadesParaCUIT = dataCuit.entidades || [];

            for (var i = 0; i < entidadesParaCUIT.length; i++) {
                var entidad = entidadesParaCUIT[i];
                
                try {
                    var tipoEntidad = entidad.esCliente ? "customer" : "vendor";
                    // Usar submitFields para optimizar governance

                    record.submitFields.promise({
                        type: tipoEntidad,
                        id: entidad.id,
                        values: {
                            custentity_l54_padron_cargado: true
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true,
                            disableTriggers: true 
                        }
                    });
                    
                    marcadas++;
                    
                } catch (errorMarcado) {
                    errores.push({
                        cuit: dataCuit.cuit,
                        entidad: entidad.id,
                        tipo: entidad.esCliente ? "Cliente" : "Proveedor",
                        error: "Error actualizando entidad: " + errorMarcado,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
        } catch (error) {
            errores.push({
                cuit: dataCuit.cuit,
                error: "Error general marcando entidades: " + error,
                timestamp: new Date().toISOString()
            });
        }
        
        return {
            marcadas: marcadas,
            errores: errores
        };
    }

    function crearRegistrosPadronCuitIndividual(dataCuit, padronExcento, jurisdiccionExcenta) {
        var padronesCreados = 0;
        var inscripcionesCreadas = 0;
        var errores = [];
        var MIN_GOVERNANCE = 50; // Reserva mínima por operación
        
        try {
            var padrones = dataCuit.padrones || [];
            var entidadesParaCUIT = dataCuit.entidades || [];
            var datosContexto = dataCuit.datosContexto;
            var informacion = dataCuit.informacion;

            log.debug("CREANDO REGISTROS", "Padron: " +  JSON.stringify(padrones) + " Entidades: " + JSON.stringify(entidadesParaCUIT));
            
            // Procesar cada padrón encontrado
            for (var i = 0; i < padrones.length; i++) {
                var padronData = padrones[i],
                    flag = true,
                    arrC = [],
                    arrV = [];
                
                // Crear registros para cada entidad relacionada
                for (var j = 0; j < entidadesParaCUIT.length; j++) {
                    var entidad = entidadesParaCUIT[j];
                    
                    try {
                        var nuevoRegistro = crearRegistroIIBBEntJur(
                            entidad.idCliente,
                            entidad.idProveedor,
                            padronData.cuit,
                            (utilities.isEmpty(padronData.alicuotaPercepcion) || parseFloat(padronData.alicuotaPercepcion, 10) < 0) ? 0 : parseFloat(padronData.alicuotaPercepcion, 10),
                            (utilities.isEmpty(padronData.alicuotaRetencion) || parseFloat(padronData.alicuotaRetencion, 10) < 0) ? 0 : parseFloat(padronData.alicuotaRetencion, 10),
                            datosContexto.idTipoPadron,
                            padronData.idContrib,
                            entidad.subsidiaria,
                            getTaxCode(padronData, datosContexto.codImpuestos, entidad.esCliente),
                            getCodRetencion(padronData, datosContexto.codRetenciones, entidad.subsidiaria, entidad.esCliente),
                            getSubtipo(padronData, datosContexto, entidad.esCliente),
                            (!utilities.isEmpty(padronData.excluido, 10) && padronData.excluido.toString().toUpperCase() === "TRUE") || false,
                            padronData.coeficiente || 0,
                            padronData.coeficiente || 0,
                            (utilities.isEmpty(padronData.alicuotaEspecial) || parseFloat(padronData.alicuotaEspecial, 10) < 0) ? 0 : parseFloat(padronData.alicuotaEspecial, 10),
                            informacion.periodo,
                            padronData.monto || 0
                        );
                        
                        if(!padronExcento.includes(entidad.idCliente) && !padronExcento.includes(entidad.idProveedor)){
                            try {
                                nuevoRegistro.save.promise({
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                });
                            } catch (error) {
                                log.error("ERROR CREANDO EL PADRON", error)
                            }
                            
                        }
                        
                        
                        padronesCreados++;

                        // Crear registro de jurisdicción si es necesario (solo una vez por padrón)
                        flag = entidad.esCliente ? evaluarCreacion(arrC, entidad.idCliente) : evaluarCreacion(arrV, entidad.idProveedor);
                        if (padronData.jurisdiccion && !padronData.monto && flag && (!jurisdiccionExcenta.includes(entidad.idCliente) && !jurisdiccionExcenta.includes(entidad.idProveedor))) {
                            crearRegistroJurisdiccion(entidad, padronData, datosContexto.idTipoPadron);
                            flag = entidad.esCliente ? arrC.push(entidad.idCliente) : arrV.push(entidad.idProveedor);
                            inscripcionesCreadas++;
                        }
                        
                    } catch (errorInsercion) {
                        log.error("ERROR EN LA FUNCION crearRegistrosPadronCuitIndividual", errorInsercion) 
                        errores.push({
                            cuit: padronData.cuit,
                            entidad: entidad.idCliente || entidad.idProveedor,
                            error: errorInsercion.toString(),
                            timestamp: new Date().toISOString()
                        });
                    }
                }
                
            }
            
        } catch (error) {
            log.error("CREAR_REGISTROS_ERROR", "Error: " + error);
            errores.push({
                cuit: dataCuit.cuit,
                error: "Error general creando registros: " + error,
                timestamp: new Date().toISOString()
            });
        }
        
        return {
            padronesCreados: padronesCreados,
            inscripcionesCreadas: inscripcionesCreadas,
            errores: errores
        };
    }

    // ================== FUNCIONES AUXILIARES ==================

    function getParams() {
        try {
            var informacion = {},
                currScript = runtime.getCurrentScript(),
                OneWorldAcc = utilities.l54esOneworld();
            
            informacion.automatico = (String(currScript.getParameter("custscript_l54_carga_padrones_mr_aut")).toLowerCase() === "true");
            informacion.padron = currScript.getParameter("custscript_l54_carga_padrones_mr_pad");
            informacion.periodo = currScript.getParameter("custscript_l54_carga_padrones_mr_per");
            informacion.consultaNuevos = currScript.getParameter("custscript_l54_carga_padrones_mr_cn");
            informacion.tipoConsultaPadron = currScript.getParameter("custscript_l54_carga_padrones_mr_tcp");
            informacion.email = currScript.getParameter("custscript_l54_carga_padrones_mr_email");
            informacion.jurisdiccion = currScript.getParameter("custscript_l54_carga_padrones_mr_jur");
            informacion.limitMax = currScript.getParameter("custscript_l54_carga_padrones_mr_max") || 10;
            informacion.OneWorldAcc = OneWorldAcc;
            
            informacion.subsidiary =  OneWorldAcc ? (currScript.getParameter("custscript_l54_carga_padrones_mr_sub") || "[]").split("\u0005"): null;
            informacion.subsidiary =  informacion.automatico ?  JSON.parse(informacion.subsidiary) : informacion.subsidiary;
            return informacion;
        } catch (excepcion) {
            log.error("getParams", "Error obteniendo parámetros: " + excepcion);
            return null;
        }
    }

    function evaluarCreacion(array, valor) {
        if (!array || !Array.isArray(array)) {
            return false;
        }
        
        return array.indexOf(valor) == -1;
    }
    
    function procesarArraysCuit(flagClientes, arrayDatos) {
        var arrayResultado = [];
        for(var i = 0; i < arrayDatos.length; i++){
            var tempValue = flagClientes ? arrayDatos[i].idInternoClientes : arrayDatos[i].idInternoProveedores;
            var setResultado = new Set(arrayResultado);
            if(!utilities.isEmpty(tempValue)){
                if(tempValue.indexOf(",") != -1){
                    var idsInternos = tempValue.split(",");
                    for(var j = 0; j < idsInternos.length; j++){
                        var idActual = idsInternos[j].trim();
                        if(!setResultado.has(idActual)) {
                            arrayResultado.push(idActual);
                            setResultado.add(idActual);
                        }
                    }
                }else{
                    if(!setResultado.has(tempValue)) {
                        arrayResultado.push(tempValue);
                        setResultado.add(tempValue);
                    }
                }
            }
        }
        return arrayResultado;
    }

    function unificarDataPadronesEntidades(arrayEntidades, idPadron, busquedaTotal) {
        try {
            var resultadoUnificado = [];
            if (!utilities.isEmpty(arrayEntidades) && arrayEntidades.length > 0) {
                for (var i = 0; i < arrayEntidades.length; i++) {
                    resultadoUnificado.push({
                        "id": arrayEntidades[i].idInternoEntidades,
                        "cuit": arrayEntidades[i].cuit,
                        "idContrib": arrayEntidades[i].idContrib,
                        "subsidiaria": arrayEntidades[i].subsidiary
                    });
                }
            }
            return resultadoUnificado;
        } catch (e) {
            log.error("unificarDataPadronesEntidades", "Error: " + e);
            return [];
        }
    }

    function encontrarEntidadesParaCUIT(cuit, entidadesRelacionadas) {
        var entidadesEncontradas = [];
        
        // Buscar en clientes
        entidadesRelacionadas.clientes.forEach(function(cliente) {
            if (cliente.cuit === cuit) {
                var idsClientes = cliente.id.split(",");
                idsClientes.forEach(function(idCliente) {
                    entidadesEncontradas.push({
                        idCliente: idCliente,
                        idProveedor: null,
                        subsidiaria: cliente.subsidiaria,
                        esCliente: true
                    });
                });
            }
        });
        
        // Buscar en proveedores
        entidadesRelacionadas.proveedores.forEach(function(proveedor) {
            if (proveedor.cuit === cuit) {
                var idsProveedores = proveedor.id.split(",");
                idsProveedores.forEach(function(idProveedor) {
                    entidadesEncontradas.push({
                        idCliente: null,
                        idProveedor: idProveedor,
                        subsidiaria: proveedor.subsidiaria,
                        esCliente: false
                    });
                });
            }
        });
        
        entidadesEncontradas = Array.from(
            new Map(entidadesEncontradas.map(e => [JSON.stringify(e), e])).values()
        );
    
        return entidadesEncontradas;
    }

    function extraerEntidadesSinPadron(cuit, entidadesRelacionadas) {
        const resultado = [];
        
        // Procesar clientes (eliminar duplicados dentro de clientes)
        const idsClientesProcesados = new Set();
        entidadesRelacionadas.clientes.forEach(item => {
            if (item.cuit === cuit && item.id) {
                const ids = item.id.split(',');
                
                ids.forEach(id => {
                    const idLimpio = id.trim();
                    if (idLimpio && !idsClientesProcesados.has(idLimpio)) {
                        idsClientesProcesados.add(idLimpio);
                        resultado.push({
                            id: idLimpio,
                            esCliente: true
                        });
                    }
                });
            }
        });

        // Procesar proveedores (eliminar duplicados dentro de proveedores)
        const idsProveedoresProcesados = new Set();
        entidadesRelacionadas.proveedores.forEach(item => {
            if (item.cuit === cuit && item.id) {
                const ids = item.id.split(',');
                
                ids.forEach(id => {
                    const idLimpio = id.trim();
                    if (idLimpio && !idsProveedoresProcesados.has(idLimpio)) {
                        idsProveedoresProcesados.add(idLimpio);
                        resultado.push({
                            id: idLimpio,
                            esCliente: false
                        });
                    }
                });
            }
        });
        
        return resultado;
    }

    function getTaxCode(padronData, codImpuestos, esCliente) {
        if (!esCliente) return ""; // Solo para clientes
        
        var arrayImpuesto = codImpuestos.filter(function(obj) {
            return obj.subTipoPadron == padronData.subTipoPadron;
        });
        
        return arrayImpuesto.length > 0 ? arrayImpuesto[0].id : "";
    }

    function getCodRetencion(padronData, codRetenciones, subsidiaria, esCliente) {
        if (esCliente) return ""; // Solo para Proveedores
        var arrayRetencion = codRetenciones.filter(function(obj) {
            return obj.subTipoPadron == padronData.subTipoPadron && 
                   obj.idSubsidiaria.indexOf(subsidiaria) > -1;
        });
        
        return arrayRetencion.length > 0 ? arrayRetencion[0].id : "";
    }

    function getSubtipo(padronData, datosContexto, esCliente) {
        if (esCliente) {
            var arrayImpuesto = datosContexto.codImpuestos.filter(function(obj) {
                return obj.subTipoPadron == padronData.subTipoPadron;
            });
            return arrayImpuesto.length > 0 ? arrayImpuesto[0].idInternoSubTipo : "";
        } else {
            var arrayRetencion = datosContexto.codRetenciones.filter(function(obj) {
                return obj.subTipoPadron == padronData.subTipoPadron;
            });
            return arrayRetencion.length > 0 ? arrayRetencion[0].idInternoSubTipo : "";
        }
    }

    function crearRegistroIIBBEntJur(idCliente, idProveedor, cuit, alicuotaPercepcion, alicuotaRetencion, idTipoPadron, idContrib, subsidiaria, idImpuesto, idRetencion, idInternoSubTipo, padronExcluyente, coeficienteRetencion, coeficientePercepcion, alicuotaEspecial, periodoContable, montoEmbargos) {
        var objRecord = record.create({
            type: "customrecord_l54_pv_iibb_jur_cliente",
            isDynamic: false
        });

        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_cuit", value: cuit });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_alic_perc", value: alicuotaPercepcion });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_alic_ret", value: alicuotaRetencion });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_cliente", value: idCliente });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_proveedor", value: idProveedor });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_codigo_impuesto", value: idImpuesto });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_cod_retencion", value: idRetencion });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_estado", value: idContrib });
        
        if(!utilities.isEmpty(subsidiaria)){
            objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_subsidiaria", value: subsidiaria });
        }
        
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_tipo_padron", value: idTipoPadron });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_subtipo_padron", value: idInternoSubTipo });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_excluyente", value: padronExcluyente });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_coeficiente_ret", value: coeficienteRetencion });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_coeficiente_perc", value: coeficientePercepcion });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_alic_ret_esp", value: alicuotaEspecial });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_id_periodo", value: periodoContable });
        objRecord.setValue({ fieldId: "custrecord_l54_pv_jc_monto", value: montoEmbargos });

        return objRecord;
    }

    function crearRegistroJurisdiccion(entidad, padronData, idTipoPadron) {
        try {
            var objRecord = record.create({
                type: "customrecord_l54_jurisdicciones_iibb",
                isDynamic: false
            });

            objRecord.setValue({ fieldId: "custrecord_l54_jurisdicciones_iibb_tipo", value: padronData.idContrib });
            objRecord.setValue({ fieldId: "custrecord_l54_jurisdicciones_iibb_jur", value: padronData.jurisdiccion });
            objRecord.setValue({ fieldId: "custrecord_l54_jurisdicciones_iibb_cli", value: entidad.idCliente });
            objRecord.setValue({ fieldId: "custrecord_l54_jurisdicciones_iibb_prov", value: entidad.idProveedor });

            objRecord.save.promise({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });;
        } catch (error) {
            log.error("CREAR_JURISDICCION", "Error creando jurisdicción: " + error);
            return null;
        }
    }

    // ================== FUNCIONES AUXILIARES XML Y HTTP ==================

    function construirXMLRequest(jsonBody) {
        return "<?xml version=\"1.0\" encoding=\"utf-8\"?> " +
               "<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" " +
               "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> " +
               "<soap:Body>" +
               "<consultaPadron xmlns=\"http://tempuri.org/\">" +
               "<solicitud>" + JSON.stringify(jsonBody) + "</solicitud>" +
               "</consultaPadron>" +
               "</soap:Body>" +
               "</soap:Envelope>";
    }

    function parsearRespuestaXML(responseBody) {
        try {
            var xmlDocument = xml.Parser.fromString({ text: responseBody });
            
            var nodes = xml.XPath.select({
                node: xmlDocument,
                xpath: "//*[name()=\"consultaPadronResult\"]"
            });
            
            if (nodes.length > 0) {
                var err = xml.XPath.select({
                    node: xmlDocument,
                    xpath: "//*[name()=\"error\"]"
                });

                var errBool = (err[0] && err[0].textContent === "true");

                if (!errBool) {
                    var padronesNodes = xml.XPath.select({
                        node: xmlDocument,
                        xpath: "//*[name()=\"informacionRespuesta\"]"
                    });

                    if (!utilities.isEmpty(padronesNodes[0]) && !utilities.isEmpty(padronesNodes[0].textContent)) {
                        return {
                            success: true,
                            data: JSON.parse(padronesNodes[0].textContent)
                        };
                    } else {
                        return {
                            success: true,
                            data: []
                        };
                    }
                } else {
                    return {
                        success: false,
                        error: "Error reportado por el middleware"
                    };
                }
            }

            return {
                success: false,
                error: "Respuesta XML inválida"
            };

        } catch (error) {
            return {
                success: false,
                error: "Error parseando XML: " + error
            };
        }
    }
    
    function procesarErroresSummary(summary, estadisticas) {
        // Procesar errores de Input
        if (summary.inputSummary.error) {
            estadisticas.errores.push({
                fase: 'Input',
                mensaje: summary.inputSummary.error
            });
        }

        // Procesar errores de Map
        if (summary.mapSummary.errors) {
            summary.mapSummary.errors.iterator().each(function(key, value) {
                estadisticas.errores.push({
                    fase: 'Map',
                    clave: key,
                    mensaje: JSON.parse(value).message
                });
                return true;
            });
        }

        // Procesar errores de Reduce
        if (summary.reduceSummary.errors) {
            summary.reduceSummary.errors.iterator().each(function(key, value) {
                estadisticas.errores.push({
                    fase: 'Reduce',
                    clave: key,
                    mensaje: JSON.parse(value).message
                });
                return true;
            });
        }
    }

    function enviarNotificacionFinal(estadisticas) {
        try {
            var informacion = getParams();
            var idUsuario = informacion.email || runtime.getCurrentUser().id;
            
            var searchNombrePadron = InitSearch.getSearchLookField(
                "customrecord_l54_tipo_padron",
                informacion.padron,
                ["name"]
            );
            var nombrePadron = searchNombrePadron.name || informacion.padron;
            
            var searchNombrePeriodo = InitSearch.getSearchLookField(
                "accountingperiod",
                informacion.periodo,
                ["periodname"]
            );
            var nombrePeriodo = searchNombrePeriodo.periodname || informacion.periodo;
            
            var subject = "Proceso Carga de Padrones " + nombrePadron + " Para el Periodo " + nombrePeriodo + " - Completado ";
            var body = construirMensajeFinalCompleto(estadisticas, nombrePadron, informacion, nombrePeriodo);
            
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

    function construirMensajeFinalCompleto(estadisticas, nombrePadron, parameters, nombrePeriodo) {
        log.debug("parameters", JSON.stringify(parameters))

        var infoConsulta = InitSearch.getSearchLookField(
            "customrecord_l54_tipo_consulta_padron",
            parameters.tipoConsultaPadron,
            ["name"]
        );
        var consultaNuevasEntidades = (parameters.consultaNuevos === "F" || parameters.consultaNuevos == false || utilities.isEmpty(parameters.consultaNuevos)) ? "NO" : "SI";

        filters = [['isinactive', 'is', 'F'],
                    "AND",
                    ["internalid","anyof", parameters.subsidiary]
                ];

        columns = [
            { name: 'internalid', alias: 'internalid' }, 
            { name: 'legalname', alias: 'legalname' }
        ];

        
        let arrSubs = InitSearch.getSearchCreated("subsidiary", filters, columns)
        
        var subsidiarias = arrSubs.map(s => s.legalname)

        var mensaje = "PROCESO CARGA DE PADRONES COMPLETADO ";
        if (estadisticas.totales.erroresTotal > 0)  mensaje += "CON ERRORES";
            mensaje += "\n\n";
            mensaje += "PARAMETROS SELECCIONADOS: " + "\n";
            mensaje += "• PADRÓN: " + nombrePadron + "\n";
            mensaje += "• PERIODO: " + nombrePeriodo + "\n";
            mensaje += "• CONSULTAR NUEVAS ENTIDADES: " + consultaNuevasEntidades + "\n";
            mensaje += "• TIPO: " + infoConsulta.name + "\n";
            mensaje += "• SUBSIDIARIAS: " + subsidiarias + "\n\n";
            
            mensaje += "RESUMEN DE RESULTADOS:\n";
            mensaje += "• Registros creados de tipo Jurisdicciones IIBB: " + estadisticas.totales.inscripcionesCreadas + "\n";
            mensaje += "• Registros creados de tipo IIBB Entidad Jurisdicción: " + estadisticas.totales.padronesCreados + "\n";
            mensaje += "• Entidades marcadas: " + estadisticas.totales.entidadesMarcadas + "\n";
            
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
            var idUsuario = (informacion && informacion.email) ? informacion.email : runtime.getCurrentUser().id;
            
            email.send({
                author: idUsuario,
                recipients: idUsuario,
                subject: "Error en Proceso de Carga de Padrones",
                body: "Se ha producido un error en el proceso de carga de padrón:\n\n" + mensaje + 
                      "\n\nPor favor revise los logs para más detalles."
            });
        } catch (error) {
            log.error("EMAIL_ERROR", "Error enviando email de error: " + error);
        }
    }

    function convertToBoolean(string) {
        return ((utilities.isEmpty(string) || string == "F" || string == false) ? false : true);
    }

    // ================== RETURN ==================
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
})