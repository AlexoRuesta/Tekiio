/**
 * @NApiVersion 2.1
 * @NScriptType plugintypeimpl
 * @NModuleScope Public
 *
 * Implementation of Vendor Payment Plugin
 */

 define(['N/format', 'L54/utilidades', 'N/search', 'N/runtime'],
    function (format, utilidades, search, runtime) {

      function generarPercepciones(parameters){
        const proceso = "Calcular Percepciones en ventas iva";
        const respuestaPercepciones = {
          error: false,
          warning: false,
          mensajeError: new Array(),
          mensajeWarning: new Array(),
          mensajeOk: "",
          infoPercepciones: new Array(),
          cantidadLineasPercepcion: 0,
          codigo_IVA: null,
          //Informacion Impuesto Interno
          errorImpInt: false,
          warningImpInt: false,
          mensajeErrorImpInt: new Array(),
          mensajeWarningImpInt: new Array(),
          mensajeOkImpInt: "",
          infoImpuestoInterno: new Array(),
          cantidadLineasImpInt: 0,
        };
        const currentScript = runtime.getCurrentScript();
        try {

          const param_codigo_IVA = currentScript.getParameter("custscript_l54_calcular_percep_per_iva");
          const taxType = currentScript.getParameter("custscript_l54_calcular_percep_tax_type");

          respuestaPercepciones.codigo_IVA = param_codigo_IVA;
          respuestaPercepciones.taxType = taxType;

          const infoTransaccion = parameters;
          log.debug(proceso, "infoTransaccion: " + JSON.stringify(infoTransaccion));


          if (!utilidades.isEmpty(infoTransaccion) && !utilidades.isEmpty(infoTransaccion.informacionTransaccion)) {

            const informacionTransaccion = JSON.parse(infoTransaccion.informacionTransaccion);
            log.debug(proceso, "informacionTransaccion: " + JSON.stringify(informacionTransaccion));
            if (!utilidades.isEmpty(informacionTransaccion)) {

              const calcularPercepciones = informacionTransaccion.calcularPercepcionesIVA;
              const clienteTransaccion = informacionTransaccion.cliente;
              //var jurisdiccionTransaccion = nlapiGetFieldValue('custbody_l54_zona_impuestos');
              // Nuevo - Considerar Jurisdicccion de Entrega
              const jurisdiccionEntrega = informacionTransaccion.jurisdiccionEntrega;
              const arrayJurisdiccionEntregaCodigo = [];
              const infoJurisdiccionDireccionEntrega = {};
              infoJurisdiccionDireccionEntrega.jurisdiccionDireccionEntrega = "";
              infoJurisdiccionDireccionEntrega.jurisdiccionDireccionEntregaText = "";
              infoJurisdiccionDireccionEntrega.jurisdiccionEntregaCodigoDireccionEntrega = "";

              // if (!utilidades.isEmpty(jurisdiccionNoPosee) && !utilidades.isEmpty(informacionTransaccion.jurisdiccionDireccionEntrega) && informacionTransaccion.jurisdiccionDireccionEntrega != jurisdiccionNoPosee) {
              // 	infoJurisdiccionDireccionEntrega.jurisdiccionDireccionEntrega = informacionTransaccion.jurisdiccionDireccionEntrega;
              // 	infoJurisdiccionDireccionEntrega.jurisdiccionDireccionEntregaText = informacionTransaccion.jurisdiccionDireccionEntregaText;
              // }

              const subsidiariaTransacicon = informacionTransaccion.subsidiaria;
              const subsidiariaTransaciconText = informacionTransaccion.subsidiariaText;
              const tipoContribuyente = informacionTransaccion.tipoContribuyente;
              let trandate = informacionTransaccion.trandate;
              trandate = getDate(trandate);
              trandate.setHours(0, 0, 0, 0);
              // Se consulta la Configuración General IIBB de la empresa para determinar su configuración y jurisdicciones
              const recConfGeneral = obtenerJurisdiccionesAgentePercepcion(subsidiariaTransacicon);
              // Acá se buscan los datos de las jurisdicciones que están marcadas como obligatorias en la config general IIBB con el campo de calcular Percepción CABA, calcular Percepción BUE, calcular Percepcion 
              //var jurisdiccionesObligatorias = obtenerInfoJurisdiccionesObligatorias(recConfGeneral.calcularPercepcionCABA, recConfGeneral.calcularPercepcionBUE, recConfGeneral.calcularPercepcionTUCUMAN);
              //jurisdiccionEntregaCodigo = nlapiLookupField('customrecord_l54_zona_impuestos', jurisdiccionEntrega, 'custrecord_l54_zona_impuestos_codigo');

             
              if (!utilidades.isEmpty(jurisdiccionEntrega)) {
                arrayJurisdiccionEntregaCodigo.push(jurisdiccionEntrega);
              }

              if (!utilidades.isEmpty(infoJurisdiccionDireccionEntrega.jurisdiccionDireccionEntrega)) {
                arrayJurisdiccionEntregaCodigo.push(infoJurisdiccionDireccionEntrega.jurisdiccionDireccionEntrega);
              }

              const arregloConfiguracionDetalle = obtenerArregloConfDetalle(recConfGeneral.idConfGeneral);
              log.debug("calcular_percepcion_ventas", "LINE 385 - arregloConfiguracionDetalle: " + JSON.stringify(arregloConfiguracionDetalle));

              //nlapiLogExecution('DEBUG', 'calcular_percepcion_ventas', 'LINE 420 - jurisdiccionEntregaCodigo: ' + jurisdiccionEntregaCodigo + ' - infoJurisdiccionDireccionEntrega.jurisdiccionEntregaCodigoDireccionEntrega : ' + infoJurisdiccionDireccionEntrega.jurisdiccionEntregaCodigoDireccionEntrega);
              informacionTransaccion.informacion_articulos_iva = agruparMontos(arregloConfiguracionDetalle, informacionTransaccion.informacion_articulos_iva, tipoContribuyente);
              const total = informacionTransaccion.total;
              let subTotal = informacionTransaccion.subTotal;
              let tipoCambio = parseFloat(informacionTransaccion.tipoCambio, 10);
              if (utilidades.isEmpty(tipoCambio)) {
                tipoCambio = 1.00;
              }

              if (!utilidades.isEmpty(clienteTransaccion) && !utilidades.isEmpty(total)) {
                if (utilidades.isEmpty(subTotal)) {
                  subTotal = total;
                }

                // Verificar si se deben Calcular Percepciones
                if (calcularPercepciones == true) {
                  let mensajesErrores = "";
                  // verifico si esta cargada la parametrizaciÃ³n general
                  if (utilidades.isEmpty(recConfGeneral) || (!utilidades.isEmpty(recConfGeneral) && (recConfGeneral.confGeneralDefinida == false && recConfGeneral.idConfGeneral == 0)) || (!utilidades.isEmpty(recConfGeneral) && (recConfGeneral.idEstadoExento == 0 || recConfGeneral.idTipoContribIIBBDefault == 0))) {
                    let mensaje = "Proceso PV finalizado. No se encuentra definida la parametrizaciÃ³n general";
                    if ((!utilidades.isEmpty(recConfGeneral) && recConfGeneral.confGeneralDefinida != false && recConfGeneral.idConfGeneral != 0)) {
                      mensaje = "Proceso PV finalizado. No se encuentra correctamente configurada la parametrizaciÃ³n general";
                    }
                    if (!utilidades.isEmpty(subsidiariaTransacicon)) {
                      mensaje = mensaje + " para la Subsidiaria : " + subsidiariaTransaciconText;
                    }
                    mensaje = mensaje + ".";

                    respuestaPercepciones.error = true;
                    respuestaPercepciones.mensajeError.push(mensaje);
                  }
                  log.debug("Calcular Percepciones en Ventas FLAG 3", "ENTRE AL IF DE RECONFIGGENERAL");
                  if (respuestaPercepciones.error == false) {
                    let indiceItems = 0;
                    log.debug("calcular_percepcion_ventas arrayItems", "LINE 443 - detalle de items IVa que vienen: " + JSON.stringify(informacionTransaccion));
                    for (let i = 0; i < informacionTransaccion.informacion_articulos_iva.length; i++) {
                      try {
                        let importeArticulos = 0;
                        const resultadoConfDetalle = arregloConfiguracionDetalle.filter(function (obj) {
                          return (obj.tipoContribuyenteIVA.split(",").indexOf(tipoContribuyente) >= 0 && obj.idInterno == informacionTransaccion.informacion_articulos_iva[i].idInterno && obj.tipoImpuesto.split(",").indexOf(informacionTransaccion.informacion_articulos_iva[i].tipoIVA) >= 0);
                        });

                        log.debug("calcular_percepcion_ventas", "LINE 451 - Configuracion detalle encontrado: " + JSON.stringify(resultadoConfDetalle[0]));
                        let superaMinBaseCalc = true;

                        if (convertToBoolean(resultadoConfDetalle[0].calcularSobreNeto)) {
                          importeArticulos = parseFloat(informacionTransaccion.informacion_articulos_iva[i].baseNetaImponible, 10);
                        } else if (convertToBoolean(resultadoConfDetalle[0].calcularSobreBruto)) {
                          importeArticulos = parseFloat(informacionTransaccion.informacion_articulos_iva[i].baseImporteBruto, 10);
                        }

                        if (parseFloat(importeArticulos, 10) < parseFloat(resultadoConfDetalle[0].importeMinimo, 10) && convertToBoolean(resultadoConfDetalle[0].aplicarMinANeto)) {
                          superaMinBaseCalc = false;
                        }
                        if (superaMinBaseCalc) {

                          const porcentajeAlicuota = parseFloat(parseFloat(convertToInteger(parseFloat(resultadoConfDetalle[0].alicuota, 10)), 10) / (100 * Math.pow(10, countDecimales(resultadoConfDetalle[0].alicuota))), 10).toString();
                          let porcentajeImpuesto = 0;

                          if (porcentajeAlicuota.search("%") != -1) {
                            porcentajeImpuesto = porcentajeAlicuota.substring(0, porcentajeAlicuota.length - 1);
                          } else {
                            // porcentajeImpuesto = parseFloat((parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoPer[i].porcentajeImpuesto, 10)), 10) * (100/parseFloat(Math.pow(10, countDecimales(parseFloat(codigosRetencionIIBB.infoPer[i].porcentajeImpuesto, 10))), 10))), 10);
                            const cantidadDecimalesPorcentajeImpuesto = parseFloat(countDecimales(parseFloat(porcentajeAlicuota, 10)), 10);
                            if (cantidadDecimalesPorcentajeImpuesto > 2) {
                              const cantidadUnidadesCero = cantidadDecimalesPorcentajeImpuesto - 2; // El -2 es por el 100, que tiene dos unidades de 0
                              porcentajeImpuesto = parseFloat((parseFloat(convertToInteger(parseFloat(porcentajeAlicuota, 10)), 10) / parseFloat(Math.pow(10, cantidadUnidadesCero))), 10);
                            } else {
                              porcentajeImpuesto = parseFloat((parseFloat(convertToInteger(parseFloat(porcentajeAlicuota, 10)), 10) * (100 / parseFloat(Math.pow(10, cantidadDecimalesPorcentajeImpuesto), 10))), 10);
                            }
                          }

                          let porcentajeFinal = Math.abs(parseFloat(porcentajeImpuesto, 10));
                          // Se evalua si existe importe minimo de percepcion y se 
                          if (!utilidades.isEmpty(porcentajeFinal) && !isNaN(porcentajeFinal) && porcentajeFinal > 0) {
                            if (parseFloat(countDecimales(parseFloat(porcentajeFinal, 10)), 10) > 13) {
                              porcentajeFinal = parseFloat(parseFloat(porcentajeFinal, 10).toFixedOK(2), 10);
                            }

                            if (parseFloat(countDecimales(parseFloat(importeArticulos, 10)), 10) > 13) {
                              importeArticulos = parseFloat(parseFloat(importeArticulos, 10).toFixedOK(2), 10);
                            } else {
                              importeArticulos = parseFloat(parseFloat(importeArticulos, 10).toFixedOK(2), 10);
                            }
                            log.debug("calcularPercepcionesVentas log", "importeArticulos: " + importeArticulos);
                            let montoImponiblePercOriginal = 0.0;
                            let montoImponiblePerc = 0.0;
                            let importePercCalculado = 0.0;
                            let diferenciaRedondeo = 0.0;
                            let importePercCalculadoRedondeado = 0.0; // importe de percepción
                            let montoImponiblePercMonedaLocal = 0.0;
                            let cantDecMontoImpPerc = 0; // montoImponiblePerc
                            let cantDecPorcentFinal = 0; // porcentajeFinal
                            let cantDecTotalMontoImpPorc = 0; // suma de cantDecMontoImpPerc y cantDecPorcentFinal
                            const cantDecMontoImpPercMonedaLocal = 0;
                            cantDecPorcentFinal = countDecimales(porcentajeFinal);

                            if (!isNaN(importeArticulos)) {
                              log.debug("calcular_percepcion_ventas", "LINE 504 - Ingresa a setear los importes y la cantidad de decimales de los mismos; importe es un number: " + importeArticulos + " - ÍNDICE: " + i);
                              const decimalesImporte = countDecimales(parseFloat(importeArticulos, 10));
                              const decimalesCoeficienteBaseImponible = countDecimales(parseFloat(1, 10));
                              const decimalesImporteCoeficienteTotal = decimalesImporte + decimalesCoeficienteBaseImponible;
                              // montoImponiblePerc = Math.abs(parseFloat(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10) * parseFloat(codigosRetencionIIBB.infoPer[i].coeficienteBaseImponible,10), 10).toFixedOK(2)); // monto imp perc nuevo
                              //montoImponiblePerc = Math.abs(parseFloat(numberTruncTwoDec(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10) * parseFloat(codigosRetencionIIBB.infoPer[i].coeficienteBaseImponible,10)), 10)); // monto imp perc nuevo
                              montoImponiblePerc = Math.abs(parseFloat(parseFloat(parseFloat(convertToInteger(parseFloat(importeArticulos, 10)), 10) * parseFloat(convertToInteger(parseFloat(1, 10)), 10) / (Math.pow(10, decimalesImporteCoeficienteTotal)), 10).toFixedOK(2), 10)); // monto imp perc nuevo
                              //importePercCalculado = parseFloat(montoImponiblePerc * parseFloat((parseFloat(porcentajeFinal, 10) / 100), 10), 10).toFixedOK(2);
                              cantDecMontoImpPerc = countDecimales(montoImponiblePerc);
                              cantDecTotalMontoImpPorc = cantDecMontoImpPerc + cantDecPorcentFinal;
                              importePercCalculado = Math.abs(parseFloat(((parseFloat(convertToInteger(montoImponiblePerc), 10) * parseFloat(convertToInteger(parseFloat(porcentajeFinal, 10)), 10)) / (100 * Math.pow(10, cantDecTotalMontoImpPorc))), 10));
                              montoImponiblePercOriginal = Math.abs(parseFloat(importeArticulos, 10));
                              diferenciaRedondeo = parseFloat(importePercCalculado - parseFloat(importePercCalculado.toFixedDown(2), 10), 10);
                            }
                            let superaMinPerc = true;
                            log.debug("Calcular Percepciones en Ventas FLAG 4.1", "Valores imporMinPerecpion: " + resultadoConfDetalle[0].importeMinPercepcion + "   importePercCalculado:" + importePercCalculado);
                            if (!utilidades.isEmpty(resultadoConfDetalle[0].importeMinPercepcion) && !isNaN(resultadoConfDetalle[0].importeMinPercepcion) && parseFloat(resultadoConfDetalle[0].importeMinPercepcion, 10) > 0) {
                              if (parseFloat(resultadoConfDetalle[0].importeMinPercepcion, 10) > parseFloat(importePercCalculado, 10)) {
                                superaMinPerc = false;
                              }
                            }
                            if (superaMinPerc) {
                              const indexAux = -1;
                              const encontrado = false;
                              for (let j = 0; j < respuestaPercepciones.infoPercepciones.length && encontrado == false; j++) {
                                if (respuestaPercepciones.infoPercepciones[j].id == resultadoConfDetalle[0].internalid) {
                                  indexAux;
                                }

                              }


                              respuestaPercepciones.infoPercepciones[indiceItems] = new Object();
                              respuestaPercepciones.infoPercepciones[indiceItems].id = resultadoConfDetalle[0].internalid;
                              respuestaPercepciones.infoPercepciones[indiceItems].item = resultadoConfDetalle[0].itemPercepcion;
                              respuestaPercepciones.infoPercepciones[indiceItems].descripcion = "";
                              respuestaPercepciones.infoPercepciones[indiceItems].cantidad = 1;
                              respuestaPercepciones.infoPercepciones[indiceItems].importeUnitario = 0;
                              respuestaPercepciones.infoPercepciones[indiceItems].importeTotal = 0;
                              respuestaPercepciones.infoPercepciones[indiceItems].codigoImpuesto = resultadoConfDetalle[0].impuestoGeneral;
                              respuestaPercepciones.infoPercepciones[indiceItems].taxType = resultadoConfDetalle[0].taxType;
                              // Nuevo - Configurar porcentaje
                              respuestaPercepciones.infoPercepciones[indiceItems].porcentaje = porcentajeFinal;
                              respuestaPercepciones.infoPercepciones[indiceItems].jurisdiccion = "";
                              respuestaPercepciones.infoPercepciones[indiceItems].montoImponiblePercMonedaLocal = 0.0;
                              respuestaPercepciones.infoPercepciones[indiceItems].procesoPV = "T";

                              importePercCalculadoRedondeado = parseFloat(parseFloat(importePercCalculado, 10).toFixedOK(2), 10); // imp percepción redondeado
                              cantDecImporteNeto = countDecimales(importePercCalculadoRedondeado);
                              cantDecTipoCambio = countDecimales(tipoCambio);
                              
                              montoImponiblePercMonedaLocal = Math.abs(parseFloat(parseFloat((parseFloat((parseFloat(parseFloat(convertToInteger(parseFloat(importePercCalculadoRedondeado, 10)), 10) * parseFloat(convertToInteger(parseFloat(tipoCambio, 10)), 10) * 100, 10) / parseFloat(convertToInteger(parseFloat(porcentajeFinal, 10)), 10)), 10) / Math.pow(10, cantDecMontoImpPercMonedaLocal)), 10), 10));
                              if (parseFloat(countDecimales(parseFloat(montoImponiblePercMonedaLocal, 10)), 10) > 13) {
                                montoImponiblePercMonedaLocal = parseFloat(parseFloat(montoImponiblePercMonedaLocal, 10).toFixedOK(2), 10);
                              }
                              
                              respuestaPercepciones.infoPercepciones[indiceItems].montoImponiblePercMonedaLocal = Math.abs(parseFloat(parseFloat(montoImponiblePercMonedaLocal, 10).toFixedOK(2), 10));
                              
                              respuestaPercepciones.infoPercepciones[indiceItems].montoImponibleOriginal = montoImponiblePerc;


                              // Nuevo - cambios para manejar importes y sus redondeos.
                              respuestaPercepciones.infoPercepciones[indiceItems].importeImpuestoOriginal = importePercCalculado;
                              respuestaPercepciones.infoPercepciones[indiceItems].importeImpuesto = importePercCalculadoRedondeado;
                              respuestaPercepciones.infoPercepciones[indiceItems].montoImponible = montoImponiblePerc;
                              respuestaPercepciones.infoPercepciones[indiceItems].diferenciaRedondeo = diferenciaRedondeo;
                              // Nuevo - Coeficiente Base Imponible (Perc Salta)
                              respuestaPercepciones.infoPercepciones[indiceItems].coeficienteBaseImponible = Math.abs(1);
                              respuestaPercepciones.infoPercepciones[indiceItems].montoImponiblePercOriginal = Math.abs(montoImponiblePercOriginal);
                              // Nuevo - Norma IIBB
                              respuestaPercepciones.infoPercepciones[indiceItems].normaIIBB = "";
                              respuestaPercepciones.infoPercepciones[indiceItems].tipoContribuyenteIIBB = "";


                              indiceItems = parseInt(indiceItems, 10) + parseInt(1, 10);
                            } else {
                              mensajesErrores += "No se realizará el cálculo de percepción de IVA para el tipo de producto " + informacionTransaccion.informacion_articulos_iva[i].tipoProductoTexto + " y tipo iva: " + informacionTransaccion.informacion_articulos_iva[i].tipoIVATexto + " porque no se supera el mínimo de percepción configurado. \n";
                              log.debug("calcularPercepcionesVentas", "mensajesErrores: " + mensajesErrores);
                            }

                            rellenarSegmentosLinea(subsidiariaTransacicon, respuestaPercepciones);

                          } else {
                            mensajesErrores = "No se realizará el cálculo de percepción IVA para la jurisdicción de TUCUMÁN porque la alícuota especial configurada es 0%. \n";
                          }

                          //nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'montoImponiblePerc: ' + montoImponiblePerc + ' / importePercCalculado: ' + importePercCalculado + ' / importeMinPercepcion: ' + codigosRetencionIIBB.infoPer[i].importeMinPercepcion + ' / superaMinPerc: ' + superaMinPerc);

                        } else {
                          mensajesErrores += "No se realizará el cálculo de percepción de IVA porque no se supera el mínimo de base de cálculo de percepción configurado. \n";
                          log.debug("calcularPercepcionesVentas", "mensajesErrores: " + mensajesErrores);
                        }
                      } catch (e) {
                        log.debug("calcular_percepcion_ventas error", "LINE 452 - Configuracion detalle error: " + e);
                      }

                    }
                    respuestaPercepciones.cantidadLineasPercepcion = indiceItems;
                    if (indiceItems > 0) {
                      respuestaPercepciones.mensajeOk = mensajesErrores + " \n Proceso PV IVA finalizado. Se agregaron la cantidad de líneas de percepciones en ventas: " + indiceItems;
                    } else {
                      respuestaPercepciones.mensajeOk = mensajesErrores + "\n Proceso PV IVA finalizado. La Transaccion no genera Percepciones";
                    }
                  }

                }
                else {
                  respuestaPercepciones.error = false;
                  respuestaPercepciones.cantidadLineasPercepcion = 0;
                  if (informacionTransaccion.letra == "E") respuestaPercepciones.mensajeOk = "Proceso PV IVA finalizado. Era una factura letra E.";
                  else if (informacionTransaccion.llevaPercepcion == "F") respuestaPercepciones.mensajeOk = "Proceso PV IVA finalizado. Era un " + informacionTransaccion.nameTipoContribIIBB;
                  else respuestaPercepciones.mensajeOk = "Proceso PV IVA finalizado. No se calcularon percepciones ventas.";
                }


              } else {
                // Falta Ingresar Cliente o Articulos
                if (utilidades.isEmpty(clienteTransaccion)) {
                  respuestaPercepciones.error = true;
                  respuestaPercepciones.cantidadLineasPercepcion = 0;
                  respuestaPercepciones.mensajeError.push("El Proceso de Percepciones en Ventas IVA requiere que se ingrese previamente un Cliente");
                }
                // Si no hay Articulos no es error y no se calculan Percepciones en VENTAS.
              }

            } else {
              // Error Obteniendo Informacion de la Transaccion
              respuestaPercepciones.error = true;
              respuestaPercepciones.cantidadLineasPercepcion = 0;
              respuestaPercepciones.mensajeError.push("Error Al Obtener la Informacion de la Transaccion");
            }
          } else {
            // Error Obteniendo Informacion de la Transaccion
            respuestaPercepciones.error = true;
            respuestaPercepciones.cantidadLineasPercepcion = 0;
            respuestaPercepciones.mensajeError.push("Error Al Obtener la Informacion de la Transaccion ");
          }
        } catch (err) {
          respuestaPercepciones.error = true;
          respuestaPercepciones.cantidadLineasPercepcion = 0;
          respuestaPercepciones.mensajeError.push("Error Calculando Percepciones IVA - Error : " + err.message);
          log.error("Calculo Percepciones IVA", "Error Calculando Percepciones en VENTAS IVA - Error : " + err.message);
          log.error("Calculo Percepciones IVA", JSON.stringify(err));
        }

        const informacionRespuestaJSON = [];
          informacionRespuestaJSON.push(respuestaPercepciones);
          log.debug(proceso, "informacionRespuestaJSON: " + JSON.stringify(informacionRespuestaJSON));
          //responseSuitelet.write({ output: JSON.stringify(informacionRespuestaJSON) });
          return({ output: JSON.stringify(informacionRespuestaJSON) });
      }
       //Toma una fecha ubicada en otra zona horaria y la mueve a GMT0. Con zonaHoraria se puede cambiar por otra diferente a GMT0
    function getDate(fecha, zonaHoraria) {
      let utc = new Date(fecha); //GMT 0   
      zonaHoraria = utilidades.isEmpty(zonaHoraria) ? 0 : zonaHoraria;
      utc = utc.getTime() + (utc.getTimezoneOffset() * 60000);
      return new Date(utc + (3600000 * zonaHoraria));
    }

    // funcion copiada de L54 - Calcular Percepciones Venta.js, comprobado con l54_proceso_pv_iva.js que son iguales
    // nombre V1=obtenerJurisdiciconesAgentePercepcion (tiene un typo, dice jurisdiCICOnes)
    // Método que me devuelve las jurisdicciones en las cuales la compañía es Agente de Percepción.
    function obtenerJurisdiccionesAgentePercepcion(subsidiaria) {

      const proceso = "obtenerJurisdiccionesAgentePercepcion";
      const resultadoJurisdicciones = {};

      try {
        let jurisdiccionesVinculadas = "";
        resultadoJurisdicciones.idConfGeneral = 0;
        resultadoJurisdicciones.idEstadoExento = 0;
        resultadoJurisdicciones.idTipoContribIIBBDefault = 0;
        resultadoJurisdicciones.idTipoContribIIBBDefaultText = "";
        resultadoJurisdicciones.jurisdicciones = new Array();
        resultadoJurisdicciones.confGeneralDefinida = false;

        const filtros = [{ name: "isinactive", operator: "IS", values: false }];
        if (!utilidades.isEmpty(subsidiaria)) {
          const filtro1 = {
            name: "custrecord_l54_pv_gral_subsidiaria",
            operator: "ANYOF",
            values: subsidiaria
          };
          filtros.push(filtro1);
        }

        const columnaJurisdiccion = [
          "internalid",
          "custrecord_l54_pv_gral_estado_exento",
          "custrecord_l54_pv_gral_jur_vinc_perc",
          "custrecord_l54_pv_gral_contr_iibb_def_p",
          "custrecord_l54_pv_gral_perc_caba",
          "custrecord_l54_pv_gral_perc_bue",
          "custrecord_l54_pv_gral_perc_tucuman"
        ];

        // const objResultSet = utilidades.searchSavedPro("customsearch_l54_obt_dat_config_gen_iibb", filtros);
        const resultSet = search.create({
          type: "customrecord_l54_pv_iibb_config_general",
          filters: filtros,
          columns: columnaJurisdiccion
        }).run().getRange({ start: 0, end: 1 });

        if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
          resultadoJurisdicciones.confGeneralDefinida = true;
          resultadoJurisdicciones.idConfGeneral = resultSet[0].getValue({ name: columnaJurisdiccion[0] });
          resultadoJurisdicciones.idEstadoExento = resultSet[0].getValue({ name: columnaJurisdiccion[1] });
          jurisdiccionesVinculadas = resultSet[0].getValue({ name: columnaJurisdiccion[2] });
          resultadoJurisdicciones.idTipoContribIIBBDefault = resultSet[0].getValue({ name: columnaJurisdiccion[3] });
          resultadoJurisdicciones.idTipoContribIIBBDefaultText = resultSet[0].getText({ name: columnaJurisdiccion[3] });
          resultadoJurisdicciones.calcPerCABA = resultSet[0].getText({ name: columnaJurisdiccion[4] });
          resultadoJurisdicciones.calcPerBUE = resultSet[0].getText({ name: columnaJurisdiccion[5] });
          resultadoJurisdicciones.calcPerTUC = resultSet[0].getText({ name: columnaJurisdiccion[6] });

          if (!utilidades.isEmpty(jurisdiccionesVinculadas) && jurisdiccionesVinculadas.length > 0) {
            const arrayJurisdicciones = jurisdiccionesVinculadas.split(",");
            if (!utilidades.isEmpty(arrayJurisdicciones) && arrayJurisdicciones.length > 0) {
              for (let i = 0; !utilidades.isEmpty(arrayJurisdicciones) && i < arrayJurisdicciones.length; i++) {
                resultadoJurisdicciones.jurisdicciones.push(arrayJurisdicciones[i]);
              }
            }
          }
        } else {
          log.error(proceso, "No se encontró ningún resultado de configuración general IIBB para la subsidiaria: " + subsidiaria);
        }

      } catch (error) {
        log.error(proceso, "Error al intentar consultar datos de IIBB Configuración General - NetSuite Excepción - Detalles: " + error.message);
      }
      log.debug(proceso, "resultadoJurisdicciones: " + JSON.stringify(resultadoJurisdicciones));
      return resultadoJurisdicciones;
    }

    function obtenerArregloConfDetalle(idConfGeneral) {

      const informacionArregloConfDetalle = new Array();
      log.debug("obtenerArregloConfDetalle INICIO", "Inicio ObtenerArregloconfDetalle idConfGeneral=" + idConfGeneral);
      if (!utilidades.isEmpty(idConfGeneral)) {
        try {
          const filtroTransReferencia = search.createFilter({
            name: "custrecord_l54_pv_det_link_padre",
            operator: search.Operator.IS,
            values: idConfGeneral
          });

          // const search = new nlapiLoadSearch("customrecord_l54_pv_iibb_config_detalle", "customsearch_l54_conf_per_iva");
          const _search = search.load({
            id: "customsearch_l54_conf_per_iva",
          });
          _search.filters.push(filtroTransReferencia);

          const resultSet = _search.run();
          const resultadosConfDetalle = resultSet.getRange({ start: 0, end: 1000 });


          if (resultadosConfDetalle != null && resultadosConfDetalle.length > 0) {
            
            const columns = resultSet.columns;
            for (let i = 0; i < resultadosConfDetalle.length; i++) {
              // Verifico si la Juridiccion usa Padron o no
              informacionArregloConfDetalle[i] = new Object();
              informacionArregloConfDetalle[i].idInterno = resultadosConfDetalle[i].getValue(columns[0]);
              informacionArregloConfDetalle[i].impuestoGeneral = resultadosConfDetalle[i].getValue(columns[1]);
              informacionArregloConfDetalle[i].itemPercepcion = resultadosConfDetalle[i].getValue(columns[3]);
              informacionArregloConfDetalle[i].importeMinimo = resultadosConfDetalle[i].getValue(columns[5]);
              informacionArregloConfDetalle[i].aplicarMinANeto = convertToBoolean(resultadosConfDetalle[i].getValue(columns[6]));
              informacionArregloConfDetalle[i].alicuota = resultadosConfDetalle[i].getValue(columns[2]);
              informacionArregloConfDetalle[i].tipoContribuyenteIIBB = resultadosConfDetalle[i].getValue(columns[4]);
              informacionArregloConfDetalle[i].tipoContribuyenteIVA = resultadosConfDetalle[i].getValue(columns[7]);
              informacionArregloConfDetalle[i].importeMinPercepcion = resultadosConfDetalle[i].getValue(columns[10]);
              informacionArregloConfDetalle[i].calcularSobreNeto = convertToBoolean(resultadosConfDetalle[i].getValue(columns[8]));
              informacionArregloConfDetalle[i].calcularSobreBruto = convertToBoolean(resultadosConfDetalle[i].getValue(columns[9]));
              informacionArregloConfDetalle[i].tipoPercepcion = resultadosConfDetalle[i].getValue(columns[11]);
              informacionArregloConfDetalle[i].tipoImpuesto = resultadosConfDetalle[i].getValue(columns[12]);
              informacionArregloConfDetalle[i].tipoImpuestoTexto = resultadosConfDetalle[i].getText(columns[12]);
              informacionArregloConfDetalle[i].tipoProducto = resultadosConfDetalle[i].getValue(columns[13]);
              informacionArregloConfDetalle[i].tipoProductoTexto = resultadosConfDetalle[i].getText(columns[13]);
              informacionArregloConfDetalle[i].taxType = resultadosConfDetalle[i].getValue(columns[14]);
            }
          }
        } catch (e) {
          log.debug("obtenerArregloConfDetalle Error", e);
        }

      }
      
      return informacionArregloConfDetalle;
    }

    function convertToBoolean(string) {
      return ((utilidades.isEmpty(string) || string == "F" || string == false) ? false : true);
    }

    function agruparMontos(arregloConfiguracionDetalle, informacion_articulos_iva, tipoContribuyente) {
      //var result = new Array();
      
      const result = new Array();
      for (let i = 0; i < informacion_articulos_iva.length; i++) {

        const resultadoConfDetalle = arregloConfiguracionDetalle.filter(function (obj) {
          // return ((obj.jurisdiccion === objEstadosIIBB.jurisdicciones[i].jurisdiccion) && (obj.tipoContribuyenteIIBB.split(',').indexOf(objEstadosIIBB.jurisdicciones[i].tipoContribuyente) >= 0) &&
          // 	(obj.jurisdiccionSede === objEstadosIIBB.jurisdicciones[i].jurisdiccionSede) && (obj.tipoContribuyenteIVA.split(',').indexOf(tipoContribuyente) >= 0));
          return (obj.tipoContribuyenteIVA.split(",").indexOf(tipoContribuyente) >= 0 && obj.tipoProducto.split(",").indexOf(informacion_articulos_iva[i].tipoProducto) >= 0 && obj.tipoImpuesto.split(",").indexOf(informacion_articulos_iva[i].tipoIVA) >= 0);
        });
        if (!utilidades.isEmpty(resultadoConfDetalle) && resultadoConfDetalle.length > 0) {
          const objectIVA = new Object();
          objectIVA.tipoIVA = informacion_articulos_iva[i].tipoIVA;
          objectIVA.baseNetaImponible = informacion_articulos_iva[i].baseNetaImponible;
          objectIVA.baseImporteBruto = informacion_articulos_iva[i].baseImporteBruto;
          objectIVA.baseImporteIVA = informacion_articulos_iva[i].baseImporteIVA;
          objectIVA.idInterno = resultadoConfDetalle[0].idInterno;
          objectIVA.tipoProducto = resultadoConfDetalle[0].tipoProducto;
          objectIVA.tipoProductoTexto = resultadoConfDetalle[0].tipoProductoTexto;
          objectIVA.tipoIVATexto = resultadoConfDetalle[0].tipoImpuestoTexto;

          let index = -1;
          let encontrado = false;
          for (let j = 0; j < result.length && encontrado == false; j++) {
            if (result[j].idInterno == resultadoConfDetalle[0].idInterno) {
              index = j;
              encontrado = true;
              log.debug("calcular_percepciones_ventas", "Entre al if aviso");
            }

          }

          if (index >= 0) {
            result[index].baseNetaImponible = parseFloat(result[index].baseNetaImponible, 10) + parseFloat(informacion_articulos_iva[i].baseNetaImponible, 10);
            result[index].baseImporteBruto = parseFloat(result[index].baseImporteBruto, 10) + parseFloat(informacion_articulos_iva[i].baseImporteBruto, 10);
            result[index].baseImporteIVA = parseFloat(result[index].baseImporteIVA, 10) + parseFloat(informacion_articulos_iva[i].baseImporteIVA, 10);
          } else {
            result.push(objectIVA);
          }

        }


      }

      
      return result;
    }

    // Función que sirve para eliminar el separador decimal y transformar un número en entero.
    function convertToInteger(number) {

      let numberConvert = 0.0;

      if (!utilidades.isEmpty(number))
        numberConvert = parseFloat(number, 10).toString().replace(".", "");

      return parseFloat(numberConvert, 10);
    }

    // Función que sirve para retornar cuantos decimales posee un número
    function countDecimales(number) {

      let cantidadDecimales = 0;

      if (!utilidades.isEmpty(number)) {
        const arrayNumber = parseFloat(number, 10).toString().split(".");
        cantidadDecimales = (arrayNumber.length == 2) ? arrayNumber[1].length : 0;
      }

      return cantidadDecimales;
    }


    Number.prototype.toFixedDown = function (digits) {
      const re = new RegExp("(\\d+\\.\\d{" + digits + "})(\\d)"),
        m = this.toString().match(re);
      return m ? parseFloat(m[1]) : this.valueOf();
    };

    Number.prototype.toFixedOK = function (decimals) {
      const sign = this >= 0 ? 1 : -1;
      return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
    };

    
    function rellenarSegmentosLinea(subsidiariaTransaccion, respuestaPercepciones){
      if(utilidades.isEmpty(subsidiariaTransaccion)){
        log.error("rellenarSegmentosLinea", "la subsidiaria esta vacia, es requerida para filtrar");
        return;
      }
      const filtro = search.createFilter({
        name: "custrecord_l54_seg_subsidiaria",
        operator: "ANYOF",
        values: subsidiariaTransaccion
      });

      const searchConfigSegmentos = search.load({
                id: "customsearch_l54_segmentos_percepcion"
      });
      searchConfigSegmentos.filters.push(filtro);

      const resultSet = searchConfigSegmentos.run();

      const searchResult = resultSet.getRange({
          start: 0,
          end: 1
      });

      if (!utilidades.isEmpty(searchResult) && searchResult.length > 0) {

        respuestaPercepciones.segmentoClase = searchResult[0].getValue({
            name: resultSet.columns[0]
        });
        respuestaPercepciones.segmentoDepartamento = searchResult[0].getValue({
            name: resultSet.columns[1]
        });
        respuestaPercepciones.segmentoUbicacion = searchResult[0].getValue({
            name: resultSet.columns[2]
        });
      }else{
        log.error("rellenarSegmentosLinea", "no se encontro resultado en customsearch_l54_segmentos_percepcion con subsidiaria: "+subsidiariaTransaccion);
      }
    }

        return {
            generarPercepciones: generarPercepciones
        };
    });