/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NAmdConfig /SuiteScripts/L54 - configuration.json
 * 
 */
define(["LIB - Search", "N/runtime"], function(libSearch, runtime) {
    
    //const proceso = "L54 - Búsqueda CUIT (RL) - Lotes Secuenciales";
    const { InitSearch } = libSearch;
    const searchLib = new InitSearch();
    
    // ===== CACHE SOLO PARA FEATURES (no para búsquedas) =====
    let featuresCache = null;
    
    function doPost(context) {
        const startTime = Date.now();
        const initialGovernance = runtime.getCurrentScript().getRemainingUsage();
        
        log.audit("INICIO_LOTE", {
            lote: context.contador || "N/A",
            resultIndex: context.resultIndex || 0,
            resultQuantity: context.resultQuantity || 0,
            governance: initialGovernance
        });

        try {
            const params = validarParametrosParaLotes(context);
            if (params.error) {
                return crearRespuestaError(params.mensaje);
            }

            const features = getFeaturesCacheados();
            
            // ===== CREAR BÚSQUEDA OPTIMIZADA PARA ESTE LOTE =====
            const savedSearch = crearBusquedaParaLote(params, features);
            
            // ===== EJECUTAR LOTE ESPECÍFICO =====
            const resultados = ejecutarLoteEspecifico(
                savedSearch, 
                params.resultIndex, 
                params.resultQuantity,
                features
            );

            // ===== PROCESAR RESULTADOS =====
            const resultadosProcesados = procesarResultadosLote(
                resultados, 
                params, 
                features
            );

            // ===== MÉTRICAS =====
            const endTime = Date.now();
            const tiempoEjecucion = endTime - startTime;
            
            log.audit("FIN_LOTE", {
                lote: params.bloque,
                registrosObtenidos: resultadosProcesados.length,
                tiempoTotal: tiempoEjecucion
            });

            return crearRespuestaExitosa(resultadosProcesados);

        } catch (error) {
            log.error("ERROR_LOTE", `❌ Lote ${context.contador}: ${error.message}`);
            return crearRespuestaError(`Error en lote: ${error.message}`);
        }
    }

    // ==========================================
    // VALIDACIÓN OPTIMIZADA PARA LOTES
    // ==========================================

    function validarParametrosParaLotes(context) {
        try {
            if (!context.id_SS) {
                return { error: true, mensaje: "Parámetro id_SS es requerido" };
            }

            // Parse más directo para lotes secuenciales
            const idSubsidiary = context.idSubsidiary ? JSON.parse(context.idSubsidiary) : [];
            const arrayResultados = context.arrayResultados ? JSON.parse(context.arrayResultados) : [];

            return {
                id_SS: context.id_SS,
                idSubsidiary: Array.isArray(idSubsidiary) ? idSubsidiary : [idSubsidiary],
                consultarClientes: String(context.consultarClientes).toLowerCase() === "true",
                busquedaTotal: String(context.busquedatotal).toLowerCase() === "true",
                resultIndex: Math.max(0, parseInt(context.resultIndex) || 0),
                resultQuantity: parseInt(context.resultQuantity),
                arrayResultados: arrayResultados,
                bloque: parseInt(context.contador) || 1
            };

        } catch (error) {
            return { error: true, mensaje: "Error validando parámetros: " + error.message };
        }
    }

    function getFeaturesCacheados() {
        // Solo cachear features porque no cambian durante la ejecución
        if (!featuresCache) {
            featuresCache = {
                multiSubsidiaryCustomer: runtime.isFeatureInEffect({ feature: "MULTISUBSIDIARYCUSTOMER" }),
                oneWorld: runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" })
            };
            log.debug("FEATURES_DETECTADOS", featuresCache);
        }
        return featuresCache;
    }
    
    function crearBusquedaParaLote(params, features) {
        try {
            log.debug("CREANDO_BUSQUEDA_LOTE", {
                id_SS: params.id_SS,
                subsidiarias: params.idSubsidiary.length,
                consultarClientes: params.consultarClientes
            });

            const savedSearch = searchLib.getSavedSearch(params.id_SS);
            
            // Construir filtros específicos para este lote
            const filtrosLote = construirFiltrosParaLote(params, features);
            
            if (filtrosLote.length > 0) {
                savedSearch.filters.push(...filtrosLote);
            }
            log.debug("savedSearch", savedSearch.filters)
            // Agregar columna de subsidiaria si es necesario
            if (features.oneWorld) {
                savedSearch.columns.push(searchLib.getColumn("internalid", "mseSubsidiary", "GROUP"));
            }
            log.debug("savedSearch.columns", savedSearch.columns)

            log.debug("BUSQUEDA_CONFIGURADA", {
                filtrosTotales: savedSearch.filters.length,
                columnasTotales: savedSearch.columns.length
            });

            return savedSearch;

        } catch (error) {
            log.error("ERROR_CREANDO_BUSQUEDA", "❌ Error: " + error.message);
            throw error;
        }
    }

    function construirFiltrosParaLote(params, features) {
        const filtros = [];

        if (params.idSubsidiary && params.idSubsidiary.length > 0) {
            try {
                if (params.consultarClientes) {
                    // Para clientes
                    if (features.multiSubsidiaryCustomer) {
                        filtros.push(searchLib.getFilter("internalid", "msesubsidiary", "anyof", params.idSubsidiary));
                    } else {
                        filtros.push(searchLib.getFilter("subsidiary", null, "anyof", params.idSubsidiary));
                    }
                } else {
                    // Para proveedores
                    filtros.push(searchLib.getFilter("internalid", "msesubsidiary", "anyof", params.idSubsidiary));
                }

                log.debug("FILTROS_LOTE", {
                    cantidad: filtros.length,
                    subsidiarias: params.idSubsidiary,
                    esClientes: params.consultarClientes
                });

            } catch (error) {
                log.error("ERROR_FILTROS_LOTE", "❌ Error: " + error.message);
            }
        }

        return filtros;
    }

    // ==========================================
    // EJECUCIÓN OPTIMIZADA PARA LOTE ESPECÍFICO
    // ==========================================

    function ejecutarLoteEspecifico(savedSearch, startIndex, maxRecords, features) {
        try {
            
            log.debug("EJECUTANDO_LOTE", {
                startIndex: startIndex,
                maxRecords: maxRecords,
                loteInicio: new Date().toISOString()
            });

            // Usar runPaged para eficiencia
            const pagedData = savedSearch.runPaged({ pageSize: 1000 });
            const resultados = [];
            
            let recordsCollected = 0;
            
            // Calcular páginas específicas para este lote
            const startPage = Math.floor(startIndex / 1000);
            const endPage = Math.ceil((startIndex + maxRecords) / 1000);
            const offsetInFirstPage = startIndex % 1000;
            
            log.debug("PAGINACION_LOTE", {
                totalPaginas: pagedData.pageRanges.length,
                paginaInicio: startPage,
                paginaFin: Math.min(endPage, pagedData.pageRanges.length),
                offsetInicial: offsetInFirstPage,
                totalRegistrosDisponibles: pagedData.count
            });

            // Procesar solo las páginas necesarias para este lote
            for (let pageIndex = startPage; pageIndex < Math.min(endPage, pagedData.pageRanges.length) && recordsCollected < maxRecords; pageIndex++) {
                
                const page = pagedData.fetch({ index: pageIndex });
                
                // Determinar inicio y fin en esta página
                const startInPage = pageIndex === startPage ? offsetInFirstPage : 0;
                const endInPage = Math.min(page.data.length, startInPage + (maxRecords - recordsCollected));
                
                // Extraer registros específicos de esta página
                for (let i = startInPage; i < endInPage; i++) {
                    const resultado = extraerDatosRegistro(page.data[i], features);
                    resultados.push(resultado);
                    recordsCollected++;
                }

                // Log de progreso para páginas grandes
                if (pageIndex % 5 === 0) {
                    log.debug("PROGRESO_PAGINA", {
                        pagina: pageIndex,
                        registrosRecolectados: recordsCollected,
                        objetivo: maxRecords
                    });
                }
            }

            return resultados;

        } catch (error) {
            log.error("ERROR_EJECUTANDO_LOTE", "❌ Error: " + error.message);
            throw error;
        }
    }

    function extraerDatosRegistro(searchResult, features) {
        try {
            const columns = searchResult.columns;
            
            const resultado = {
                cuit: searchResult.getValue(columns[0]) || "",
                idInternoEntidades: searchResult.getValue(columns[1]) || "",
                idContrib: searchResult.getValue(columns[2]) || ""
            };

            // Agregar subsidiaria si OneWorld está habilitado
            if (features.oneWorld && columns[3]) {
                resultado.subsidiary = searchResult.getValue(columns[3]) || "";
            }

            return resultado;

        } catch (error) {
            log.debug("ERROR_EXTRACCION_REGISTRO", "❌ Error: " + error.message);
            return {
                cuit: "",
                idInternoEntidades: "",
                idContrib: "",
                subsidiary: ""
            };
        }
    }

    // ==========================================
    // PROCESAMIENTO OPTIMIZADO PARA LOTES
    // ==========================================

    function procesarResultadosLote(resultados, params, features) {
        if (!resultados || resultados.length === 0) {
            log.debug("LOTE_SIN_RESULTADOS", `Lote ${params.bloque}: Sin registros`);
            return [];
        }

        const resultadosFinales = [];
        
        try {
            if (params.busquedaTotal) {
                // Búsqueda total: procesamiento directo (más común en lotes)
                for (const resultado of resultados) {
                    const objInfo = crearObjetoResultado(resultado, features);
                    resultadosFinales.push(objInfo);
                }
                
            } else {
                // Búsqueda parcial: filtrar duplicados
                const existentesSet = new Set(params.arrayResultados);
                for (const resultado of resultados) {
                    const procesados = procesarRegistroConDuplicados(resultado, existentesSet, features);
                    resultadosFinales.push(...procesados);
                }
            }
            
            log.debug("LOTE_PROCESADO", {
                lote: params.bloque,
                originales: resultados.length,
                finales: resultadosFinales.length,
                tipoBusqueda: params.busquedaTotal ? "TOTAL" : "PARCIAL"
            });

            return resultadosFinales;

        } catch (error) {
            log.error("ERROR_PROCESANDO_LOTE", `❌ Lote ${params.bloque}: ${error.message}`);
            return resultadosFinales;
        }
    }

    function procesarRegistroConDuplicados(resultado, existentesSet, features) {
        const resultadosArray = [];
        
        try {
            if (resultado.idInternoEntidades && resultado.idInternoEntidades.includes(",")) {
                // Múltiples IDs
                const idsInternos = resultado.idInternoEntidades.split(",");
                
                for (const id of idsInternos) {
                    const idTrimmed = id.trim();
                    
                    if (!existentesSet.has(idTrimmed)) {
                        const objInfo = crearObjetoResultado({
                            ...resultado,
                            idInternoEntidades: idTrimmed
                        }, features);
                        resultadosArray.push(objInfo);
                    }
                }
            } else {
                // ID único
                if (!existentesSet.has(resultado.idInternoEntidades)) {
                    const objInfo = crearObjetoResultado(resultado, features);
                    resultadosArray.push(objInfo);
                }
            }

        } catch (error) {
            log.debug("ERROR_DUPLICADOS", "❌ Error: " + error.message);
        }

        return resultadosArray;
    }

    function crearObjetoResultado(resultado, features) {
        const objInfo = {
            cuit: resultado.cuit || "",
            idInternoEntidades: resultado.idInternoEntidades || "",
            idContrib: resultado.idContrib || ""
        };

        if (features.oneWorld && resultado.subsidiary) {
            objInfo.subsidiary = resultado.subsidiary;
        }

        return objInfo;
    }

    function crearRespuestaExitosa(resultados) {
        return [{
            error: false,
            mensajeError: [],
            respuesta: [resultados],
        }];
    }

    function crearRespuestaError(mensaje) {
        return [{
            error: true,
            mensajeError: [mensaje],
            respuesta: [],
            timestamp: new Date().toISOString()
        }];
    }

    return {
        post: doPost
    };
});