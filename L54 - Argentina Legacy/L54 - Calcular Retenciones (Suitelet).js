/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@NAmdConfig /SuiteScripts/configuration.json
 */
 define(["N/record", "N/file", "N/format", "L54/utilidades", "N/search", "N/runtime", "N/config"],
    function (record, file, format, utilidades, search, runtime, config) {
        /*global define log */
        /* eslint-disable no-var */
        /* eslint-disable block-scoped-var */
        /* eslint-disable no-self-assign */
        /* eslint-disable no-redeclare */
        /* eslint-disable no-undef */
        var proceso = "onRequest";
        var tipoContSUSS;
        var tipoContGAN;
        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {

            var script = runtime.getCurrentScript();

            log.audit("Governance Monitoring", "LINE 25 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

            try {

                if (context.request.method == "GET" || context.request.method == "POST") {

                    var retencionHonorarios = script.getParameter("custscript_l54_calc_ret_sl_ret_gan_hon");
                    var jurisdiccionCordoba = script.getParameter("custscript_l54_calc_ret_sl_juris_cordoba");
                    var respuestaRetenciones = new Object();
                    respuestaRetenciones.error = false;
                    respuestaRetenciones.errorFacturaM = false;
                    respuestaRetenciones.warning = false;
                    respuestaRetenciones.mensajeError = new Array();
                    respuestaRetenciones.mensajeWarning = new Array();
                    respuestaRetenciones.mensajeOk = "";
                    respuestaRetenciones.mensajeJurisdiccion = "";
                    respuestaRetenciones.esAgenteRetencionGan = false;
                    respuestaRetenciones.estaInscriptoRegimenGan = false;
                    respuestaRetenciones.esAgenteRetencionSUSS = false;
                    respuestaRetenciones.estaInscriptoRegimenSUSS = false;
                    respuestaRetenciones.esAgenteRetencionIVA = false;
                    respuestaRetenciones.estaInscriptoRegimenIVA = false;
                    respuestaRetenciones.esAgenteRetencionIIBB = false;
                    respuestaRetenciones.estaInscriptoRegimenIIBB = false;
                    respuestaRetenciones.retencion_ganancias = new Array();
                    respuestaRetenciones.retencion_suss = new Array();
                    respuestaRetenciones.retencion_iva = new Array();
                    respuestaRetenciones.retencion_iibb = new Array();
                    respuestaRetenciones.total_retenciones = 0.0;
                    respuestaRetenciones.imp_retencion_ganancias = 0.0;
                    respuestaRetenciones.imp_retencion_suss = 0.0;
                    respuestaRetenciones.imp_retencion_iva = 0.0;
                    respuestaRetenciones.imp_retencion_iibb = 0.0;
                    respuestaRetenciones.importeIVAPago = 0.0;
                    respuestaRetenciones.importePercepcionesPago = 0.0;
                    respuestaRetenciones.importe_neto_a_abonar = 0.0;
                    respuestaRetenciones.neto_bill_aplicados = 0.0;
                    respuestaRetenciones.importe_total_retencion = 0.0;
                    respuestaRetenciones.importe_iva = 0.0;
                    respuestaRetenciones.importe_percepciones = 0.0;
                    respuestaRetenciones.version_calc_ret = "";
                    var mensajeJurisdiccionesNotValid = "";

                    //var informacionPagoJson = context.request.parameters.informacionPagoJson;
                    var informacionPagoJson = context.request.parameters;
                    log.audit(proceso, "context.request.parameters: " + JSON.stringify(context.request));
                    var informacionPago = informacionPagoJson;
                    log.audit(proceso, "informacionPago: " + JSON.stringify(informacionPago));

                    // ---- Inicio - Extraigo las facturas que vienen desde el POST para poder manipularlas más adelante ---- //
                    var facturas = [];
                    for (var i = 0; i < JSON.parse(informacionPago.facturas).length; i++) {
                        facturas.push(JSON.parse(informacionPago.facturas)[i]);
                        log.audit(proceso, "factura: " + JSON.stringify(JSON.parse(informacionPago.facturas)[i]) + " -- i: " + i);
                    }

                    informacionPago.facturas = [];
                    for (var i = 0; i < facturas.length; i++) {
                        informacionPago.facturas.push(facturas[i]);
                        log.audit(proceso, "informacionPago.facturas: " + JSON.stringify(facturas[i]) + " -- i: " + i);
                    }
                    // ---- Fin - Extraigo las facturas que vienen desde el POST para poder manipularlas más adelante ---- //

                    // ---- Inicio - Extraigo las fechas que vienen desde el POST para poder manipularlas más adelante ---- //
                    informacionPago.fecha = (JSON.parse(informacionPago.fecha).length > 0) ? JSON.parse(informacionPago.fecha)[0] : null;
                    informacionPago.trandate = (JSON.parse(informacionPago.trandate).length > 0) ? JSON.parse(informacionPago.trandate)[0] : null;
                    // ---- Fin - Extraigo las fechas que vienen desde el POST para poder manipularlas más adelante ---- //

                    log.audit(proceso, "LINE 112 - informacionPago: " + JSON.stringify(informacionPago));

                    if (!isEmpty(informacionPago)) {
                        var errorGeneral = false;
                        var calcularRetIIBB = false;

                        var linea = 1;

                        var validacionCalculoRet = validarCalculosRetenciones(informacionPago);

                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - validacionCalculoRet: " + JSON.stringify(validacionCalculoRet) + " ** TIEMPO" + new Date());

                        if (!isEmpty(validacionCalculoRet) && validacionCalculoRet.error == false) {

                            // Inicializo
                            var retencion_ganancias = new Array();
                            var retencion_suss = new Array();
                            var retencion_iva = new Array();
                            var retencion_iibb = new Array();

                            var total_retenciones = 0.0;

                            var imp_retencion_ganancias = 0.0;
                            var imp_retencion_suss = 0.0;
                            var imp_retencion_iva = 0.0;
                            var imp_retencion_iibb = 0.0;

                            // Informacion para la Importacion de TXT
                            var importeIVAPago = 0.0;
                            var importePercepcionesPago = 0.0;

                            // Obtengo Informacion del Pago
                            var entity = informacionPago.entity;
                            var id_posting_period = informacionPago.periodo;
                            var tasa_cambio_pago = informacionPago.tipoCambio;
                            var total = informacionPago.importeTotal;
                            //var trandate = informacionPago.fecha;
                            var trandate = informacionPago.trandate;
                            trandate = getDate(trandate);
                            log.audit(proceso, "LINE 146 - Trandate sin formato: " + informacionPago.trandate + " - trandate formateado: " + trandate);
                            trandate.setHours(0, 0, 0, 0);
                            log.audit(proceso, "LINE 148 - Trandate final: " + trandate);
                            var moneda = informacionPago.moneda;
                            var subsidiariaPago = informacionPago.subsidiaria;
                            var tipoContribuyenteIVA = informacionPago.tipoContribuyente;

                            //var datosImpositivos = consultaDatosImpositivos(subsidiariaPago);
                            var datosImpositivos = validacionCalculoRet.datosImpositivos;

                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - datosImpositivos: " + JSON.stringify(datosImpositivos) + " ** TIEMPO" + new Date());

                            /*var resultadoDatosImp =  datosImpositivos.filter(function(obj) {
                                    return (obj.subsidiariaSS == subsidiariaPago);
                            });*/

                            var resultadoDatosImp = datosImpositivos;

                            if (!isEmpty(resultadoDatosImp) && resultadoDatosImp.length > 0) {

                                var esAgenteRetencionGan = resultadoDatosImp[0].esAgenteGanancias;
                                respuestaRetenciones.esAgenteRetencionGan = esAgenteRetencionGan;

                                var esAgenteRetencionSUSS = resultadoDatosImp[0].esAgenteSUSS;
                                respuestaRetenciones.esAgenteRetencionSUSS = esAgenteRetencionSUSS;

                                var esAgenteRetencionIVA = resultadoDatosImp[0].esAgenteIVA;
                                respuestaRetenciones.esAgenteRetencionIVA = esAgenteRetencionIVA;

                                var esAgenteRetencionIIBB = resultadoDatosImp[0].esAgenteIIBB;
                                respuestaRetenciones.esAgenteRetencionIIBB = esAgenteRetencionIIBB;

                                var estadoExentoGan = resultadoDatosImp[0].exentoGanancias;

                                var estadoExentoSUSS = resultadoDatosImp[0].exentoSUSS;

                                var estadoExentoIVA = resultadoDatosImp[0].exentoIVA;

                                var estadoExentoIIBB = resultadoDatosImp[0].exentoIIBB;

                                var esONG = resultadoDatosImp[0].esONG;

                                var jurisdiccionEmpresa = resultadoDatosImp[0].jurisdiccionEmpresa;

                                if (!isEmpty(estadoExentoGan) || !isEmpty(estadoExentoSUSS) || !isEmpty(estadoExentoIVA) || !isEmpty(estadoExentoIIBB)) {
                                    var estadosExentos = true; //Verificar uso de esta variable
                                }

                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - esAgenteRetencionGan: " + esAgenteRetencionGan + ", esAgenteRetencionSUSS: " + esAgenteRetencionSUSS + ", esAgenteRetencionIVA: " + esAgenteRetencionIVA + ", esAgenteRetencionIIBB: " + esAgenteRetencionIIBB + ", estadoExentoGan: " + estadoExentoGan + ", estadoExentoSUSS: " + estadoExentoSUSS + ", estadoExentoIVA: " + estadoExentoIVA + ", estadoExentoIIBB: " + estadoExentoIIBB + " ** TIEMPO" + new Date());
                            }

                            log.audit("Governance Monitoring", "LINE 191 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                            if (esAgenteRetencionGan == false || (esAgenteRetencionGan == true && !isEmpty(estadosExentos) && !isEmpty(estadoExentoGan) && estadoExentoGan > 0)) {
                                if (esAgenteRetencionSUSS == false || (esAgenteRetencionSUSS == true && !isEmpty(estadosExentos) && !isEmpty(estadoExentoSUSS) && estadoExentoSUSS > 0)) {
                                    if (esAgenteRetencionIVA == false || (esAgenteRetencionIVA == true && !isEmpty(estadosExentos) && !isEmpty(estadoExentoIVA) && estadoExentoIVA > 0)) {
                                        if (esAgenteRetencionIIBB == false || (esAgenteRetencionIIBB == true && !isEmpty(estadosExentos) && !isEmpty(estadoExentoIIBB) && estadoExentoIIBB > 0)) {

                                            // Recorro las Facturas a Pagar y voy Obteniendo las Retenciones a ser Aplicadas
                                            // Para mejorarlo utilizo 2 For uno donde obtengo los ID de los Vendor Bills a Pagar y los Almeceno en un Array
                                            // Otro for donde por cada elemento del Array llamo a obtener_neto_vendorbill(resultsNetosVB, id_vendorbill);
                                            // No llamo por cada Bill a pagar a el SS ya que serian muchos SearchRecord, de esta forma solo Realizo 1 SearchRecord
                                            var contadorFacturas = 0;
                                            var billsPagarAux = new Array();
                                            var billsPagar = new Array();

                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Armado array billsPagar: " + informacionPago.facturas.length + " ** TIEMPO" + new Date());

                                            for (var i = 0; i < informacionPago.facturas.length; i++) {
                                                var id_vendorbill = informacionPago.facturas[i].idVendorBill;
                                                var amount = informacionPago.facturas[i].amount;
                                                if(validacionCalculoRet.isTI.length > 0 && (validacionCalculoRet.isTI).indexOf(id_vendorbill) > -1){
                                                    total =  Math.abs(total) -  Math.abs(amount);
                                                    continue;
                                                }
                                                billsPagar[contadorFacturas] = new Object();
                                                billsPagar[contadorFacturas].idVendorBill = id_vendorbill;
                                                billsPagar[contadorFacturas].amount = amount;
                                                billsPagar[contadorFacturas].linea = i + 1;
                                                billsPagarAux[contadorFacturas] = id_vendorbill;
                                                contadorFacturas = parseInt(contadorFacturas, 10) + parseInt(1, 10);
                                            }

                                            var sinJurisdiccionUnica = true;
                                            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Antes de llamar a obtener_arreglo_netos_vendorbill con filtro de Jurisdiccion Unica == none - ** TIEMPO" + new Date());
                                            var resultsNetosVBForRetIIBB = obtener_arreglo_netos_vendorbill(entity, billsPagarAux, subsidiariaPago, sinJurisdiccionUnica, esONG);
                                            // Obtengo el array de las jurisdicciones de entrega que fueron definidas en las facturas
                                            var jurisdiccionesEntregaFacturas = obtener_jurisdicciones_entrega_facturas(resultsNetosVBForRetIIBB);
                                            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Después de llamar a obtener_arreglo_netos_vendorbill con filtro de Jurisdiccion Unica == none -" + JSON.stringify(resultsNetosVBForRetIIBB) + "** TIEMPO" + new Date());

                                            // Se obtienen las jurisdicciones en las cuales es agente de retencion la empresa
                                            var jurisdiccionesAgenteRetencion = null;
                                            var objEstadoInscripcionJurIIBB = new Object();
                                            objEstadoInscripcionJurIIBB.iibb = false;
                                            if (esAgenteRetencionIIBB == true) {

                                                jurisdiccionesAgenteRetencion = obtenerJurisdiccionesAgenteRetencion(subsidiariaPago);

                                                log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - jurisdiccionesAgenteRetencion: " + JSON.stringify(jurisdiccionesAgenteRetencion) + " ** TIEMPO" + new Date());

                                                if (jurisdiccionesAgenteRetencion != null && jurisdiccionesAgenteRetencion.idConfGeneral != 0) {
                                                    if (esAgenteRetencionIIBB == true && jurisdiccionesAgenteRetencion.jurisdicciones != null && jurisdiccionesAgenteRetencion.jurisdicciones.length > 0) {
                                                        var infoJurisdiccionesConfigGeneral = obtener_info_jurisdicciones_config_general(jurisdiccionesAgenteRetencion.jurisdicciones);
                                                        //objEstadoInscripcionJurIIBB = getProveedorInscriptoRegimenIIBB(entity, estadosExentos.iibb, jurisdiccionesAgenteRetencion.jurisdicciones);
                                                        //Modificada instruccion cambio de "estadosExentos.iibb" a "estadoExentoIIBB"
                                                        objEstadoInscripcionJurIIBB = getProveedorInscriptoRegimenIIBB(entity, estadoExentoIIBB, jurisdiccionesAgenteRetencion.jurisdicciones, jurisdiccionesEntregaFacturas, jurisdiccionesAgenteRetencion.idTipoContribIIBBDefault, jurisdiccionesAgenteRetencion.idTipoContribIIBBDefaultText, infoJurisdiccionesConfigGeneral, trandate);

                                                        log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - objEstadoInscripcionJurIIBB: " + JSON.stringify(objEstadoInscripcionJurIIBB) + " ** TIEMPO" + new Date());

                                                        if (objEstadoInscripcionJurIIBB.warning == true) {
                                                            respuestaRetenciones.warning = true;
                                                            respuestaRetenciones.mensajeWarning.push(objEstadoInscripcionJurIIBB.mensajeWarning);
                                                        }
                                                    } else {
                                                        errorGeneral = true;
                                                        respuestaRetenciones.error = true;
                                                        respuestaRetenciones.mensajeError.push("Falta Configurar Jurisdicciones Vinculadas de la Empresa en la Configuracion General de IIBB.");
                                                        //alert("Falta Configurar Jurisdicciones Vinculadas de la Empresa en la Configuracion General de IIBB.");
                                                    }

                                                } else {
                                                    errorGeneral = true;
                                                    respuestaRetenciones.error = true;
                                                    respuestaRetenciones.mensajeError.push("No se Encuentra correctamente cargada la Configuracion General de IIBB.");
                                                    //alert("No se Encuentra correctamente cargada la Configuracion General de IIBB.");
                                                }
                                            }

                                            if (errorGeneral == false) {
                                                // Me fijo a que regimenes esta inscripto el Proveedor
                                                //Creando una sola función "getProveedorInscriptoRegimen" que traiga toda la información de Ganancias, SUSS e IVA
                                                var objInscriptoRegimen = getProveedorInscriptoRegimen(entity, estadoExentoGan, estadoExentoSUSS, estadoExentoIVA, trandate);

                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - objInscriptoRegimen: " + JSON.stringify(objInscriptoRegimen) + " ** TIEMPO" + new Date());

                                                //var objInscriptoRegimenGan = getProveedorInscriptoRegimen(entity, "gan", estadosExentos.ganancias);
                                                var estaInscriptoRegimenGan = objInscriptoRegimen.inscripto_regimen_gan;
                                                respuestaRetenciones.estaInscriptoRegimenGan = estaInscriptoRegimenGan;
                                                if (objInscriptoRegimen.warning_gan == true) {
                                                    respuestaRetenciones.warning = true;
                                                    respuestaRetenciones.mensajeWarning.push(objInscriptoRegimen.mensaje_gan);
                                                }

                                                //VERIFICAR ESTA SECCION
                                                //var objInscriptoRegimenSUSS = getProveedorInscriptoRegimen(entity, "suss", estadosExentos.suss);
                                                //var estaInscriptoRegimenSUSS = objInscriptoRegimenSUSS.inscripto_regimen;
                                                var estaInscriptoRegimenSUSS = objInscriptoRegimen.inscripto_regimen_suss;
                                                respuestaRetenciones.estaInscriptoRegimenSUSS = estaInscriptoRegimenSUSS;
                                                if (objInscriptoRegimen.warning_suss == true) {
                                                    respuestaRetenciones.warning = true;
                                                    respuestaRetenciones.mensajeWarning.push(objInscriptoRegimen.mensaje_suss);
                                                }
                                                //VERIFICAR ESTA SECCION

                                                //var objInscriptoRegimenIVA = getProveedorInscriptoRegimen(entity, "iva", estadosExentos.iva);
                                                var estaInscriptoRegimenIVA = objInscriptoRegimen.inscripto_regimen_iva;
                                                respuestaRetenciones.estaInscriptoRegimenIVA = estaInscriptoRegimenIVA;
                                                if (objInscriptoRegimen.warning_iva == true) {
                                                    respuestaRetenciones.warning = true;
                                                    respuestaRetenciones.mensajeWarning.push(objInscriptoRegimen.mensaje_iva);
                                                }

                                                var estaInscriptoRegimenIIBB = false;

                                                //objEstadoInscripcionJurIIBB = getProveedorInscriptoRegimenIIBB(entity, jurisdiccionesAgenteRetencion.idEstadoExento, jurisdiccionesAgenteRetencion.jurisdicciones);
                                                estaInscriptoRegimenIIBB = objEstadoInscripcionJurIIBB.iibb;
                                                respuestaRetenciones.estaInscriptoRegimenIIBB = estaInscriptoRegimenIIBB;
                                                if (estaInscriptoRegimenIIBB == true) {
                                                    calcularRetIIBB = true;
                                                }

                                                //var resultsNetosVB = obtener_arreglo_netos_vendorbill(entity);
                                                // Obtener Codigo de Retencion M
                                                var codigoRetMGananciasConfigurado = false;
                                                var codigoRetMIVAConfigurado = false;

                                                var errorConfCodRetMGanancias = false;
                                                var errorConfCodRetMIVA = false;

                                                //var codigoRetencionM = buscarCodigoRetencionM(subsidiariaPago);

                                                var paramRetenciones = parametrizacionRetenciones(subsidiariaPago);

                                                //Revisar estos resultados, trae uno de más
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - paramRetenciones.length : " + paramRetenciones.length + ", paramRetenciones: " + JSON.stringify(paramRetenciones) + " ** TIEMPO" + new Date());


                                                var codigoRetencionMGanancias = paramRetenciones.filter(function (obj) {
                                                    return (obj.tipo_ret == 1 && obj.retencionM == true && obj.tipoContGAN.split(",").includes(tipoContGAN) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA)); //GANANCIAS
                                                });

                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - codigoRetencionMGanancias: " + JSON.stringify(codigoRetencionMGanancias) + ", codigoRetencionMGanancias.length: " + codigoRetencionMGanancias.length + " ** TIEMPO" + new Date());


                                                //var codigoRetencionMGanancias=buscarCodigoRetencionM(1,subsidiariaPago); // 1 - GANANCIAS
                                                if (!isEmpty(codigoRetencionMGanancias) && codigoRetencionMGanancias.length > 0) {
                                                    //nlapiLogExecution("DEBUG", "Valores", "Codigo Retencion : " + codigoRetencionM[0].codigo + " Pagos Pasados: " + _pagosPasadosGAN + "Importe Factura: " + retencion_ganancias[i].importe_factura_pagar + "Tipo Cambio: " + tasa_cambio_pago + " Importe Retenido Anterior : " + retencion_ganancias[i].imp_retenido_anterior);
                                                    if (!isEmpty(codigoRetencionMGanancias[0].codigo) && codigoRetencionMGanancias[0].codigo != 0) {
                                                        codigoRetMGananciasConfigurado = true;
                                                    }
                                                }

                                                var codigoRetencionMIVA = paramRetenciones.filter(function (obj) {
                                                    return (obj.tipo_ret == 2 && obj.retencionM == true && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA)); //IVA
                                                });

                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - codigoRetencionMIVA: " + JSON.stringify(codigoRetencionMIVA) + ", codigoRetencionMIVA.length: " + codigoRetencionMIVA.length + " ** TIEMPO" + new Date());

                                                //var codigoRetencionMIVA=buscarCodigoRetencionM(2,subsidiariaPago); // 2 - IVA
                                                if (!isEmpty(codigoRetencionMIVA) && codigoRetencionMIVA.length > 0) {
                                                    //nlapiLogExecution("DEBUG", "Valores", "Codigo Retencion : " + codigoRetencionM[0].codigo + " Pagos Pasados: " + _pagosPasadosGAN + "Importe Factura: " + retencion_ganancias[i].importe_factura_pagar + "Tipo Cambio: " + tasa_cambio_pago + " Importe Retenido Anterior : " + retencion_ganancias[i].imp_retenido_anterior);
                                                    if (!isEmpty(codigoRetencionMIVA[0].codigo) && codigoRetencionMIVA[0].codigo != 0) {
                                                        codigoRetMIVAConfigurado = true;
                                                    }
                                                }

                                                // Obtener Codigos de Retencion de las Transacciones e Importes Totales
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Antes de llamar a obtener_arreglo_codigos_ret_vendorbill - ** TIEMPO" + new Date());
                                                var resultsCodigosRetVB = obtener_arreglo_codigos_ret_vendorbill(entity, billsPagarAux, subsidiariaPago, esONG);
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - despues de llamar a obtener_arreglo_codigos_ret_vendorbill - resultsCodigosRetVB: " + JSON.stringify(resultsCodigosRetVB) + " ** TIEMPO" + new Date());

                                                // INICIO - Se obtiene el total de las transacciones sin incluir líneas internas (para retenciones de Córdoba)
                                                var resultsTotalesBills = obtenerTotalesTransacciones(entity, billsPagarAux, subsidiariaPago);
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Despues de llamar a obtenerTotalesTransacciones - resultsTotalesBills: " + JSON.stringify(resultsTotalesBills));
                                                // FIN - Se obtiene el total de las transacciones sin incluir líneas internas (para retenciones de Córdoba)

                                                sinJurisdiccionUnica = false;
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Antes de llamar a obtener_arreglo_netos_vendorbill - ** TIEMPO" + new Date());
                                                var resultsNetosVB = obtener_arreglo_netos_vendorbill(entity, billsPagarAux, subsidiariaPago, sinJurisdiccionUnica, esONG);
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Despues de llamar a obtener_arreglo_netos_vendorbill - resultsNetosVB: " + JSON.stringify(resultsNetosVB) + " ** TIEMPO" + new Date());

                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Antes de llamar a obtener_arreglo_netos_vendorbill_jurisdiccion - ** TIEMPO" + new Date());
                                                var resultsNetosJurisdiccion = obtener_arreglo_netos_vendorbill_jurisdiccion(entity, billsPagarAux, subsidiariaPago, esONG);
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Despues de llamar a obtener_arreglo_netos_vendorbill_jurisdiccion - resultsNetosJurisdiccion: " + JSON.stringify(resultsNetosJurisdiccion) + " ** TIEMPO" + new Date());

                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Antes de llamar a obtener_arreglo_imp_perc - ** TIEMPO" + new Date());
                                                var resultsImpPerc = obtener_arreglo_imp_perc(entity, billsPagarAux, subsidiariaPago);
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Despues de llamar a obtener_arreglo_imp_perc - resultsImpPerc: " + JSON.stringify(resultsImpPerc) + " ** TIEMPO" + new Date());

                                                // Obtener IVA de las Transacciones
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Antes de llamar a obtener_arreglo_iva_vendorbill - ** TIEMPO" + new Date());
                                                var resultsImpIVA = obtener_arreglo_iva_vendorbill(entity, billsPagarAux, subsidiariaPago, esONG);
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Despues de llamar a obtener_arreglo_iva_vendorbill - resultsImpIVA: " + JSON.stringify(resultsImpIVA) + " ** TIEMPO" + new Date());

                                                // Obtener Importe Bruto de pagos pasados en las bills a pagar para determinar si ya la factura está paga en su importe neto.
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Antes de llamar a calcularImpBrutosPagPasadosTotalesAcumulados - ** TIEMPO" + new Date());
                                                var resultsPagPasFact = calcularImpBrutosPagPasadosTotalesAcumulados(entity, billsPagarAux, subsidiariaPago, trandate);
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - Despues de llamar a calcularImpBrutosPagPasadosTotalesAcumulados - resultsPagPasFact: " + JSON.stringify(resultsPagPasFact) + " ** TIEMPO" + new Date());

                                                //FDS2 se saco afuera del for la definicion de la variable (porque se estaba poniendo en cero con cada ciclo)
                                                var importe_neto_factura_proveedor_a_pagar_total = 0.0;
                                                var importe_neto_factura_proveedor_a_pagar_total_ret_iibb = 0.0;
                                                var importe_bruto_total_facturas_aliados = 0.0;
                                                var importe_bruto_total_facturas_iibb = 0.0;
                                                var arrayFacturasJurisdiccionEntrega = [];
                                                var existeFacturaSinJurisdiccionEntrega = false;
                                                var importeBrutoPago = 0.0;

                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - billsPagar.length: " + billsPagar.length + " ** TIEMPO" + new Date());

                                                var cantidadFacturasM = 0;

                                                var pagoTotalFacturasM = true;
                                                var datoCuenta = !isEmpty(subsidiariaPago) ? "subsidiaria" : "cuenta";

                                                for (var i = 1; i <= billsPagar.length && pagoTotalFacturasM == true; i++) {
                                                    // Obtengo el identificador de la factura de proveedor aplicada
                                                    var esFacturaM = false;
                                                    var calcularSobreIVA = false;
                                                    var id_vendorbill = billsPagar[i - 1].idVendorBill;
                                                    var objInfoFacturasJurisdiccionEntrega = {};
                                                    var importe_bruto_factura_proveedor = 0.0;
                                                    var importe_bruto_factura_proveedor_a_pagar = 0.0;
                                                    var importe_total_factura_a_pagar = 0.0;
                                                    var importe_neto_factura_proveedor_a_pagar = 0.0;
                                                    var importe_neto_factura_proveedor_a_pagar_ret_iibb = 0.0;
                                                    var importe_bruto_facturas_iibb = 0.0;
                                                    var importe_bruto_facturas_aliados = 0.0;
                                                    var importe_total_factura_final = 0.0;

                                                    // *FDS2* var importe_neto_factura_proveedor_a_pagar_total = 0.0;

                                                    var importe_neto_factura_proveedor = obtener_neto_vendorbill(resultsNetosVB, id_vendorbill);
                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - importe_neto_factura_proveedor: " + JSON.stringify(importe_neto_factura_proveedor) + " ** TIEMPO" + new Date());

                                                    var importe_neto_factura_proveedor_ret_iibb = obtener_neto_vendorbill(resultsNetosVBForRetIIBB, id_vendorbill);
                                                    log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES  - importe_neto_factura_proveedor_ret_iibb: " + JSON.stringify(importe_neto_factura_proveedor_ret_iibb) + " ** TIEMPO" + new Date());

                                                    var importePercepcionesPagoAux = parseFloat(obtener_importe_percepcion(resultsImpPerc, id_vendorbill), 10);
                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - importePercepcionesPagoAux: " + JSON.stringify(importePercepcionesPagoAux) + " ** TIEMPO" + new Date());

                                                    var objCodigos = obtener_codigos_vendorbill(resultsCodigosRetVB, id_vendorbill);
                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - objCodigos: " + JSON.stringify(objCodigos) + " ** TIEMPO" + new Date());

                                                    var objInfoTotalesTransacciones = obtenerTotalesFinalesTransaccion(resultsTotalesBills, id_vendorbill);

                                                    var codigo_retencion_ganancias = "";
                                                    var nombre_retencion_ganancias = "";
                                                    var codigo_retencion_suss = "";
                                                    var nombre_retencion_suss = "";
                                                    var codigo_retencion_iva = "";
                                                    var nombre_retencion_iva = "";
                                                    var considerarPagosAntGAN = true;
                                                    var coeficiente = 0.0;
                                                    var coeficiente_iibb = 0.0;
                                                    var coeficiente_calculo_padron_cordoba = 0.0;
                                                    importe_bruto_factura_proveedor = 0.00;

                                                    if (objCodigos != null) {
                                                        if (!isEmpty(objCodigos.codigoRetGanancias)) {
                                                            codigo_retencion_ganancias = objCodigos.codigoRetGanancias;
                                                            nombre_retencion_ganancias = objCodigos.nombreRetGanancias;
                                                            if (!isEmpty(objCodigos.esFacturaM) && (objCodigos.esFacturaM == "T" || objCodigos.esFacturaM == true)) {
                                                                esFacturaM = true;
                                                                cantidadFacturasM++;
                                                            }
                                                        }
                                                        if (!isEmpty(objCodigos.codigoRetSUSS)) {
                                                            codigo_retencion_suss = objCodigos.codigoRetSUSS;
                                                            nombre_retencion_suss = objCodigos.nombreRetSUSS;
                                                        }
                                                        if (!isEmpty(objCodigos.codigoRetIVA)) {
                                                            codigo_retencion_iva = objCodigos.codigoRetIVA;
                                                            nombre_retencion_iva = objCodigos.nombreRetIVA;
                                                            if (!isEmpty(objCodigos.esFacturaM) && (objCodigos.esFacturaM == "T" || objCodigos.esFacturaM == true)) {
                                                                esFacturaM = true;
                                                                cantidadFacturasM++;
                                                            }
                                                            if (!isEmpty(objCodigos.calcularSobreIVA) && (objCodigos.calcularSobreIVA == "T" || objCodigos.calcularSobreIVA == true)) {
                                                                calcularSobreIVA = true;
                                                            }
                                                        }
                                                        importe_bruto_factura_proveedor = parseFloat(objCodigos.importeTotal, 10);
                                                    }

                                                    // obtengo el importe pagado realmente de la factura para sacar su porcentaje sobre el total
                                                    importe_bruto_factura_proveedor_a_pagar = parseFloat(billsPagar[i - 1].amount, 10);

                                                    importe_total_factura_final = importe_bruto_factura_proveedor_a_pagar;

                                                    importe_total_factura_a_pagar = (!isEmpty(objInfoTotalesTransacciones) && !isNaN(objInfoTotalesTransacciones.importeTotal)) ? parseFloat(objInfoTotalesTransacciones.importeTotal, 10) : 0.0;

                                                    // coeficiente de diferencia entre el importe bruto de la factua y el neto de la factura
                                                    coeficiente = parseFloat(Math.abs(parseFloat(importe_bruto_factura_proveedor, 10) / parseFloat(importe_neto_factura_proveedor, 10)), 10);

                                                    // Coeficiente iibb del importe de las jurisdicciones sin la jurisdicción única
                                                    coeficiente_iibb = parseFloat(Math.abs(parseFloat(importe_bruto_factura_proveedor, 10) / parseFloat(importe_neto_factura_proveedor_ret_iibb, 10)), 10);

                                                    log.debug("L54 - Calculo Retenciones", "LINE 459 - coeficiente" + coeficiente + " - coeficiente_iibb: " + coeficiente_iibb);
                                                    /* if (parseFloat(countDecimales(coeficiente), 10) > 13)
                                                        coeficiente = parseFloat(coeficiente, 10).toFixedOK(2);

                                                    if (parseFloat(countDecimales(coeficiente_iibb), 10) > 13)
                                                        coeficiente_iibb = parseFloat(coeficiente_iibb, 10).toFixedOK(2); */

                                                    log.debug("L54 - Calculo Retenciones", "LINE 466 - coeficiente" + coeficiente + " - coeficiente_iibb: " + coeficiente_iibb);
                                                    // Se determina el total de importes brutos pagados anteriormente para cada factura, y así calcular bien su importe neto a pagar total
                                                    if (!isEmpty(resultsPagPasFact) && resultsPagPasFact.length > 0) {

                                                        var impBrutoFactPagosPasados = parseFloat(obtener_imp_factura_pasado_pagada(resultsPagPasFact, id_vendorbill), 10);
                                                        var impBrutoTotalFactPagar = impBrutoFactPagosPasados + importe_bruto_factura_proveedor_a_pagar; // sumo el importe que ya ha sido pagado anteriormente con el que se quiere pagar ahora

                                                        // Se verifica si la suma de importes brutos de pagos pasados excede el importe bruto de la factura a pagar, esto se hace para no tomar en cuenta el monto en la base de calculo y asignarle 0
                                                        if (parseFloat(Math.abs(impBrutoFactPagosPasados), 10) >= parseFloat(Math.abs(importe_bruto_factura_proveedor), 10)) {
                                                            importe_bruto_factura_proveedor_a_pagar = 0.0;
                                                        } else {
                                                            // Se verifica si la suma de los importes brutos pagados anteriormente + el nuevo importe bruto de la factura a pagar sobrepasa el importe bruto total de la factura a pagar
                                                            // Si lo sobrepasa, entonces al importe de la factura a pagar le asigno lo que resta de pago permitido para esa factura, este caso es para cuando existen líneas de iva no gravado y no las toma en cuenta
                                                            // De esta manera no se excede el pago de una factura de su importe bruto permitido
                                                            if (parseFloat(Math.abs(impBrutoTotalFactPagar), 10) > parseFloat(Math.abs(importe_bruto_factura_proveedor), 10)) {
                                                                importe_bruto_factura_proveedor_a_pagar = importe_bruto_factura_proveedor - impBrutoFactPagosPasados;
                                                            }
                                                        }
                                                    } else {
                                                        if (parseFloat(Math.abs(importe_bruto_factura_proveedor_a_pagar), 10) > parseFloat(Math.abs(importe_bruto_factura_proveedor), 10)) {
                                                            importe_bruto_factura_proveedor_a_pagar = importe_bruto_factura_proveedor;
                                                        }
                                                    }

                                                    // INICIO --- Aplica sólo a la jurisdicción de córdoba
                                                    // Se extrae el monto a pagar verdadero, de acuerdo a asi existen pagos parciales o no.
                                                    importe_total_factura_final = getAmountOk(resultsPagPasFact, id_vendorbill, importe_total_factura_final, importe_total_factura_a_pagar);
                                                    log.debug("L54 - Calculo Retenciones", "LINE 593 - importe_total_factura_final: " + importe_total_factura_final);
                                                    // FIN --- Aplica sólo a la jurisdicción de córdoba

                                                    var cantidadDecimalesImporteBrutoTotal = countDecimales(importe_bruto_factura_proveedor);
                                                    var cantidadDecimalesImporteBrutoPagar = countDecimales(importe_bruto_factura_proveedor_a_pagar);
                                                    // var cantidadDecimalesImporteBrutoFinal = cantidadDecimalesImporteBrutoPagar - cantidadDecimalesImporteBrutoTotal;
                                                    var cantidadDecimalesImporteBrutoFinal = cantidadDecimalesImporteBrutoTotal - cantidadDecimalesImporteBrutoPagar;
                                                    var importe_bruto_porcentaje = parseFloat(parseFloat((parseFloat(parseFloat(convertToInteger(parseFloat(importe_bruto_factura_proveedor_a_pagar, 10)) * 100, 10) / parseFloat(convertToInteger(parseFloat(importe_bruto_factura_proveedor, 10)), 10), 10) * parseFloat(Math.pow(10, cantidadDecimalesImporteBrutoFinal), 10)), 10), 10);
                                                    importe_bruto_porcentaje = (isNaN(importe_bruto_porcentaje)) ? 0.00 : importe_bruto_porcentaje;
                                                    importe_bruto_porcentaje = (parseFloat(countDecimales(importe_bruto_porcentaje), 10) >= 10) ? parseFloat(importe_bruto_porcentaje, 10).toFixedOK(2) : importe_bruto_porcentaje;

                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 469 - importe_bruto_factura_proveedor_a_pagar antes de dividir por coeficiente: " + importe_bruto_factura_proveedor_a_pagar + " - coeficiente: " + coeficiente + " - coeficiente_iibb: " + coeficiente_iibb + " - ** TIEMPO" + new Date());

                                                    importe_neto_factura_proveedor_a_pagar = importe_bruto_factura_proveedor_a_pagar / coeficiente;
                                                    importe_neto_factura_proveedor_a_pagar_ret_iibb = importe_bruto_factura_proveedor_a_pagar / coeficiente_iibb;
                                                    importeBrutoPago += parseFloat(importe_bruto_factura_proveedor_a_pagar, 10) * parseFloat(tasa_cambio_pago, 10);

                                                    // INICIO - Cálculo de importes de aliados y de IIBB para retenciones de cordoba
                                                    if (!isNaN(importe_total_factura_final) && parseFloat(importe_total_factura_final, 10) > 0) {
                                                        if (objCodigos.esFacturaAliados == "F") {
                                                            importe_bruto_facturas_iibb += parseFloat(parseFloat(importe_total_factura_final, 10) * parseFloat(tasa_cambio_pago, 10), 10);

                                                            // Importe Total a pagar con impuestos de aliados
                                                            importe_bruto_total_facturas_iibb += importe_bruto_facturas_iibb;
                                                        } else {
                                                            importe_bruto_facturas_aliados += parseFloat(parseFloat(importe_total_factura_final, 10) * parseFloat(tasa_cambio_pago, 10), 10);

                                                            // Importe Total a pagar con impuestos de proveedores normales
                                                            importe_bruto_total_facturas_aliados += importe_bruto_facturas_aliados;
                                                        }
                                                    }

                                                    log.debug("L54 - Calculo Retenciones", "importe_bruto_total_facturas_iibb: " + importe_bruto_total_facturas_iibb + " - importe_bruto_total_facturas_aliados: " + importe_bruto_total_facturas_aliados);

                                                    // FIN - Cálculo de importes de aliados y de IIBB para retenciones de cordoba

                                                    if (isNaN(importe_neto_factura_proveedor_a_pagar))
                                                        importe_neto_factura_proveedor_a_pagar = 0.00;

                                                    if (isNaN(importe_neto_factura_proveedor_a_pagar_ret_iibb))
                                                        importe_neto_factura_proveedor_a_pagar_ret_iibb = 0.00;

                                                    if (parseFloat(countDecimales(importe_neto_factura_proveedor_a_pagar), 10) >= 10)
                                                        importe_neto_factura_proveedor_a_pagar = parseFloat(importe_neto_factura_proveedor_a_pagar, 10).toFixedOK(2);

                                                    if (parseFloat(countDecimales(importe_neto_factura_proveedor_a_pagar_ret_iibb), 10) >= 10)
                                                        importe_neto_factura_proveedor_a_pagar_ret_iibb = parseFloat(importe_neto_factura_proveedor_a_pagar_ret_iibb, 10).toFixedOK(2);

                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 474 - importe_neto_factura_proveedor_a_pagar en moneda de la transacción: " + importe_neto_factura_proveedor_a_pagar + " - importe_neto_factura_proveedor_a_pagar_ret_iibb: " + importe_neto_factura_proveedor_a_pagar_ret_iibb + " - ** TIEMPO" + new Date());
                                                    // Lo paso a la Moneda Base
                                                    // importe_neto_factura_proveedor_a_pagar = parseFloat(parseFloat(importe_neto_factura_proveedor_a_pagar, 10) * parseFloat(tasa_cambio_pago, 10), 10).toFixedOK(2);
                                                    importe_neto_factura_proveedor_a_pagar = parseFloat(parseFloat(importe_neto_factura_proveedor_a_pagar, 10) * parseFloat(tasa_cambio_pago, 10), 10);
                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - IMPORTE TOTAL FACTURA: " + importe_bruto_factura_proveedor + ", IMPORTE PAGO FACTURA: " + importe_bruto_factura_proveedor_a_pagar + ", IMPORTE NETO FACTURA: " + importe_neto_factura_proveedor + " IMPORTE NETO FACTURA PROVEEDOR A PAGAR: " + importe_neto_factura_proveedor_a_pagar + " - ** TIEMPO" + new Date());

                                                    // Importe de las facturas para Ret. IIBB, lo paso a moneda base
                                                    //importe_neto_factura_proveedor_a_pagar_ret_iibb = parseFloat(parseFloat(importe_neto_factura_proveedor_a_pagar_ret_iibb, 10) * parseFloat(tasa_cambio_pago, 10), 10).toFixedOK(2);
                                                    importe_neto_factura_proveedor_a_pagar_ret_iibb = parseFloat(parseFloat(importe_neto_factura_proveedor_a_pagar_ret_iibb, 10) * parseFloat(tasa_cambio_pago, 10), 10);

                                                    if (parseFloat(countDecimales(importe_neto_factura_proveedor_a_pagar), 10) >= 10)
                                                        importe_neto_factura_proveedor_a_pagar = parseFloat(importe_neto_factura_proveedor_a_pagar, 10).toFixedOK(2);

                                                    if (parseFloat(countDecimales(importe_neto_factura_proveedor_a_pagar_ret_iibb), 10) >= 10)
                                                        importe_neto_factura_proveedor_a_pagar_ret_iibb = parseFloat(importe_neto_factura_proveedor_a_pagar_ret_iibb, 10).toFixedOK(2);

                                                    // Importe total a pagar de las VB
                                                    importe_neto_factura_proveedor_a_pagar_total = parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10) + parseFloat(importe_neto_factura_proveedor_a_pagar, 10);

                                                    //JSALAZAR: VERIFICACIÓN DE FACTURA CON DIRECCIÓN DE ENTREGA DEFINIDA (L54 - JURISDICCIÓN ENTREGA)
                                                    objInfoFacturasJurisdiccionEntrega = obtener_info_facturas_jurisdiccion_entrega(resultsNetosVBForRetIIBB, id_vendorbill, importe_neto_factura_proveedor_a_pagar_ret_iibb);
                                                    if (!isEmpty(objInfoFacturasJurisdiccionEntrega) && objInfoFacturasJurisdiccionEntrega.tieneJurisdiccionEntrega && !isEmpty(objInfoFacturasJurisdiccionEntrega.jurisdiccionEntregaCodigo)) {
                                                        arrayFacturasJurisdiccionEntrega.push(objInfoFacturasJurisdiccionEntrega);
                                                    } else {
                                                        existeFacturaSinJurisdiccionEntrega = true;
                                                    }

                                                    // Importe total a pagar para las Ret. IIIB y acumular el total de las VB que no tienen Jurisdiccion Única
                                                    importe_neto_factura_proveedor_a_pagar_total_ret_iibb = parseFloat(importe_neto_factura_proveedor_a_pagar_total_ret_iibb, 10) + parseFloat(importe_neto_factura_proveedor_a_pagar_ret_iibb, 10);
                                                    log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES  - IMPORTE TOTAL FACTURA: " + importe_bruto_factura_proveedor + ", IMPORTE PAGO FACTURA: " + importe_bruto_factura_proveedor_a_pagar + ", IMPORTE NETO FACTURA SIN JURISD. IIBB: " + importe_neto_factura_proveedor_ret_iibb + " ** TIEMPO" + new Date());

                                                    log.debug("L54 - Calculo Retenciones", "LINE 518 - Valor de importe_neto_factura_proveedor_a_pagar_total_ret_iibb: " + importe_neto_factura_proveedor_a_pagar_total_ret_iibb + " - importe_neto_factura_proveedor_a_pagar_total: " + importe_neto_factura_proveedor_a_pagar_total);

                                                    if (parseFloat(countDecimales(importe_neto_factura_proveedor_a_pagar_total), 10) >= 10)
                                                        importe_neto_factura_proveedor_a_pagar_total = parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10).toFixedOK(2);

                                                    if (parseFloat(countDecimales(importe_neto_factura_proveedor_a_pagar_total_ret_iibb), 10) >= 10)
                                                        importe_neto_factura_proveedor_a_pagar_total_ret_iibb = parseFloat(importe_neto_factura_proveedor_a_pagar_total_ret_iibb, 10).toFixedOK(2);

                                                    log.debug("L54 - Calculo Retenciones", "LINE 526 - Valor de importe_neto_factura_proveedor_a_pagar_total_ret_iibb: " + importe_neto_factura_proveedor_a_pagar_total_ret_iibb + " - importe_neto_factura_proveedor_a_pagar_total: " + importe_neto_factura_proveedor_a_pagar_total);

                                                    // Obtengo el Porcentaje del Pago
                                                    var porcentajePago = 1;
                                                    porcentajePago = parseFloat(Math.abs(parseFloat(importe_bruto_factura_proveedor_a_pagar, 10) / parseFloat(importe_bruto_factura_proveedor, 10)), 10);
                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - porcentajePago: " + porcentajePago + " ** TIEMPO" + new Date());

                                                    // Obtengo el IVA del Pago
                                                    var objIVA = obtener_iva_vendorbill(resultsImpIVA, id_vendorbill);
                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - objIVA: " + JSON.stringify(objIVA) + " ** TIEMPO" + new Date());

                                                    var ivaAux = 0.00;
                                                    if (objIVA != null) {
                                                        ivaAux = parseFloat(objIVA.importeIVA, 10);
                                                    }

                                                    var importeIVAPagoParcial = parseFloat(ivaAux, 10) * parseFloat(porcentajePago, 10);
                                                    // importeIVAPagoParcial = parseFloat(parseFloat(importeIVAPagoParcial, 10) * parseFloat(tasa_cambio_pago, 10), 10).toFixedOK(2);
                                                    importeIVAPagoParcial = parseFloat(parseFloat(importeIVAPagoParcial, 10) * parseFloat(tasa_cambio_pago, 10), 10);
                                                    // importeIVAPago = parseFloat(importeIVAPago, 10) + parseFloat(parseFloat(importeIVAPagoParcial, 10) / parseFloat(tasa_cambio_pago, 10), 10).toFixedOK(2);
                                                    importeIVAPago = parseFloat(parseFloat(importeIVAPago, 10) + parseFloat(parseFloat(parseFloat(importeIVAPagoParcial, 10) / parseFloat(tasa_cambio_pago, 10), 10).toFixedOK(2), 10), 10);

                                                    // Ajusto el Importe de Parcepcion para luego poder cargarlo en TXT - ARCIBA
                                                    var importePercepcionesPagoParcial = parseFloat(importePercepcionesPagoAux, 10) * parseFloat(porcentajePago, 10);
                                                    importePercepcionesPago = parseFloat(importePercepcionesPago, 10) + parseFloat(importePercepcionesPagoParcial, 10);

                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - importeIVAPago: " + importeIVAPago + ", importePercepcionesPagoParcial: " + importePercepcionesPagoParcial + ", importePercepcionesPago: " + importePercepcionesPago + " ** TIEMPO" + new Date());

                                                    if ((codigo_retencion_ganancias != null && codigo_retencion_ganancias != "") ||
                                                        (codigo_retencion_suss != null && codigo_retencion_suss != "") ||
                                                        (codigo_retencion_iva != null && codigo_retencion_iva != "")) {

                                                        // Voy guardando el total de las facturas que tienen retención ganancias, SUSS, IVA e IIBB
                                                        if (!isEmpty(codigo_retencion_ganancias)) {

                                                            var resultGanRetManual = paramRetenciones.filter(function (obj) {
                                                                return (obj.codigo == codigo_retencion_ganancias && obj.tipoContGAN.split(",").includes(tipoContGAN) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                            });

                                                            if (!isEmpty(resultGanRetManual) && resultGanRetManual.length > 0) {
                                                                var esRetManual = false;
                                                                esRetManual = resultGanRetManual[0].esRetManual;

                                                                // Si es M y Mayor a $1000 usar Codigo de Retencion de Factura M
                                                                if (esFacturaM == true && parseFloat(importe_neto_factura_proveedor_a_pagar, 10) >= 1000) {
                                                                    if (codigoRetMGananciasConfigurado == true) {
                                                                        retencion_ganancias = agregarCodigoRetencion(retencion_ganancias, codigo_retencion_ganancias, importe_neto_factura_proveedor_a_pagar, esFacturaM, importe_neto_factura_proveedor, calcularSobreIVA, nombre_retencion_ganancias, esRetManual);
                                                                    }
                                                                    else {
                                                                        errorConfCodRetMGanancias = true;
                                                                    }
                                                                }
                                                                else {
                                                                    retencion_ganancias = agregarCodigoRetencion(retencion_ganancias, codigo_retencion_ganancias, importe_neto_factura_proveedor_a_pagar, esFacturaM, importe_neto_factura_proveedor, calcularSobreIVA, nombre_retencion_ganancias, esRetManual);
                                                                }
                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_ganancias: " + JSON.stringify(retencion_ganancias) + " ** TIEMPO" + new Date());
                                                            } else {
                                                                respuestaRetenciones.warning = true;
                                                                respuestaRetenciones.mensajeWarning.push("La retención de Ganancias no será calculada porque el código de retencion y la entidad no tienen los mismos criterios.");
                                                            }
                                                        }

                                                        if (!isEmpty(codigo_retencion_suss)) {

                                                            var resultSUSSRetManual = paramRetenciones.filter(function (obj) {
                                                                return (obj.codigo == codigo_retencion_suss  && obj.tipoContSUSS.split(",").includes(tipoContSUSS) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                            });

                                                            if (!isEmpty(resultSUSSRetManual) && resultSUSSRetManual.length > 0) {
                                                                var esRetManual = false;
                                                                esRetManual = resultSUSSRetManual[0].esRetManual;


                                                                retencion_suss = agregarCodigoRetencion(retencion_suss, codigo_retencion_suss, importe_neto_factura_proveedor_a_pagar, esFacturaM, importe_neto_factura_proveedor, calcularSobreIVA, nombre_retencion_suss, esRetManual);
                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss: " + JSON.stringify(retencion_suss) + " ** TIEMPO" + new Date());
                                                            } else {
                                                                respuestaRetenciones.warning = true;
                                                                respuestaRetenciones.mensajeWarning.push("La retención de SUSS no será calculada porque el código de retencion y la entidad no tienen los mismos criterios.");
                                                            }
                                                        }

                                                        if (!isEmpty(codigo_retencion_iva)) {

                                                            var resultIVARetManual = paramRetenciones.filter(function (obj) {
                                                                return (obj.codigo == codigo_retencion_iva && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                            });

                                                            if (!isEmpty(resultIVARetManual) && resultIVARetManual.length > 0) {
                                                                var esRetManual = false;
                                                                esRetManual = resultIVARetManual[0].esRetManual;

                                                                /** Modificación IVA Importe Total */
                                                                if(resultIVARetManual[0].aplicaTotal && importe_bruto_porcentaje != 100){
                                                                    var flag = false;
                                                                    if(resultsPagPasFact.length != 0){
                                                                        let firstIVA = getInfoRetencionCalcAnteriores(entity, id_posting_period, resultIVARetManual[0].codigo, subsidiariaPago, esAnualizada, trandate, resultsPagPasFact);
                                                                        flag = firstIVA.length === 0;
                                                                    }else{
                                                                        flag = true;
                                                                    }
                                                                    
                                                                    if (!flag) {
                                                                        continue; // Saltamos esta iteración si no se cumple la condición
                                                                    }
                                                                    if (flag) {
                                                                    importe_neto_factura_proveedor_a_pagar = objCodigos.importeTotal / coeficiente;

                                                                    if (parseFloat(countDecimales(importe_neto_factura_proveedor_a_pagar), 10) >= 10)
                                                                        importe_neto_factura_proveedor_a_pagar = parseFloat(importe_neto_factura_proveedor_a_pagar, 10).toFixedOK(2);

                                                                    importe_neto_factura_proveedor_a_pagar = parseFloat(parseFloat(importe_neto_factura_proveedor_a_pagar, 10) * parseFloat(tasa_cambio_pago, 10), 10);
                                                                    if (parseFloat(countDecimales(importe_neto_factura_proveedor_a_pagar), 10) >= 10)
                                                                        importe_neto_factura_proveedor_a_pagar = parseFloat(importe_neto_factura_proveedor_a_pagar, 10).toFixedOK(2);


                                                                    porcentajePago = 1;
                                                                    importeIVAPagoParcial = parseFloat(ivaAux, 10) * parseFloat(porcentajePago, 10);
                                                                    importeIVAPagoParcial = parseFloat(parseFloat(importeIVAPagoParcial, 10) * parseFloat(tasa_cambio_pago, 10), 10);
                                                                    log.debug(" Importes post", " importeIVAPagoParcial: " + importeIVAPagoParcial +  ", importe_neto_factura_proveedor_a_pagar: " + importe_neto_factura_proveedor_a_pagar)
                                                                    } 
                                                                    
                                                                }
                                                                // NUEVO ENERO 2016
                                                                // LAS RETENCIONES DE IVA SE REALIZAN SOBRE EL MONTO TOTAL DE IVA Y NO SOBRE EL NETO DE LAS TRANSACCIONES
                                                                // SI ES RETENCION DE IVA EN EL IMPORTE NETO SE ALMACENA EL IMPORTE DE IVA
                                                                // DE ESTA FORMA LA BASE DE CALCULO Y EL RESTO DE LOS CALCULOS SE REALIZAN SOBRE EL IMPORTE DE IVA Y NO SOBRE EL NETO DE LA TRANSACCION
                                                                //retencion_iva = agregarCodigoRetencion(retencion_iva, codigo_retencion_iva, importe_neto_factura_proveedor_a_pagar);
                                                                // NUEVO AGOSTO 2016
                                                                // LAS RETENCIONES DE IVA DE FACTURAS M SE REALIZAN SOBRE EL MONTO TOTAL DE IVA EL RESTO DE RETENCIONES DE IVA SOBRE EL IMPORTE NETO DE LAS TRANSACCIONES.
                                                                if (esFacturaM == true && (parseFloat(importe_neto_factura_proveedor_a_pagar, 10) >= 1000)) {
                                                                    if (codigoRetMIVAConfigurado) {
                                                                        retencion_iva = agregarCodigoRetencion(retencion_iva, codigoRetencionMIVA[0].codigo, importeIVAPagoParcial, esFacturaM, importe_neto_factura_proveedor, calcularSobreIVA, nombre_retencion_iva, esRetManual);
                                                                        //retencion_iva = agregarCodigoRetencion(retencion_iva, codigoRetencionMIVA[0].codigo, importe_neto_factura_proveedor_a_pagar, esFacturaM, importe_neto_factura_proveedor, calcularSobreIVA);
                                                                    }
                                                                    else {
                                                                        errorConfCodRetMIVA = true;
                                                                    }
                                                                }
                                                                else {
                                                                    if (calcularSobreIVA) {
                                                                        retencion_iva = agregarCodigoRetencion(retencion_iva, codigo_retencion_iva, importeIVAPagoParcial, esFacturaM, importe_neto_factura_proveedor, calcularSobreIVA, nombre_retencion_iva, esRetManual);
                                                                        //retencion_iva = agregarCodigoRetencion(retencion_iva, codigo_retencion_iva, importe_neto_factura_proveedor_a_pagar, esFacturaM, importe_neto_factura_proveedor, calcularSobreIVA);
                                                                    } else {
                                                                        if (esRetManual) {
                                                                            retencion_iva = agregarCodigoRetencion(retencion_iva, codigo_retencion_iva, importe_neto_factura_proveedor_a_pagar, esFacturaM, importe_neto_factura_proveedor, calcularSobreIVA, nombre_retencion_iva, esRetManual);
                                                                        } else {
                                                                            retencion_iva = agregarCodigoRetencion(retencion_iva, codigo_retencion_iva, importe_neto_factura_proveedor_a_pagar, esFacturaM, importe_neto_factura_proveedor, calcularSobreIVA, nombre_retencion_iva, esRetManual);
                                                                        }
                                                                    }
                                                                }
                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - retencion_iva: " + JSON.stringify(retencion_iva) + " ** TIEMPO" + new Date());
                                                            } else {
                                                                respuestaRetenciones.warning = true;
                                                                respuestaRetenciones.mensajeWarning.push("La retención de IVA no será calculada porque el código de retencion y la entidad no tienen los mismos criterios.");
                                                            }
                                                        }
                                                    }

                                                    // NUEVO-SI Es Factura M y no es un Pago Total Informo que solo se pueden realizar Pagos Totales
                                                    if (esFacturaM == true && (porcentajePago != 1)) {
                                                        pagoTotalFacturasM = false;
                                                    }
                                                }//FIN del for (var i = 1; i <= billsPagar.length && pagoTotalFacturasM==true; i++) -- El que recorre las facturas y suma los importes de las mismas.

                                                log.audit("Governance Monitoring", "LINE 534 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                // Se unifican los importes de las facturas que poseen la misma jurisdicción de entrega
                                                var arrayFacturasJurisdiccionEntregaUnificado = unificar_importes_facturas_jurisdiccion_entrega(arrayFacturasJurisdiccionEntrega);
                                                //var arrayFacturasJurisdiccionEntregaUnificado = JSON.parse(objFacturasJurisdiccionEntregaUnificado);

                                                // Nuevo - Si el Pago de la Factura M no es total Aviso.
                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - pagoTotalFacturasM: " + pagoTotalFacturasM + " ** TIEMPO" + new Date());
                                                if (pagoTotalFacturasM == true) {
                                                    // Nuevo - Solo permitir Pagar 1 Factura M
                                                    //if(cantidadFacturasM==0 || (cantidadFacturasM!=0 && billsPagar.length==1)){
                                                    //if(errorConfCodRetMGanancias==true || errorConfCodRetMIVA==true){

                                                    var codigosRetencionIIBB = new Object();
                                                    codigosRetencionIIBB.error = false;
                                                    codigosRetencionIIBB.infoRet = new Array();
                                                    var arrayJurisdicciones = [];
                                                    var objRespuestaConfigJurisdiccionGeneral = {};

                                                    if (esAgenteRetencionIIBB == true) {
                                                        if (estaInscriptoRegimenIIBB == true) {
                                                            //Inicio --- Funcionalidad para caso donde se permita introducir en la Jurisdicción Única, jurisdicciones diferentes a las configuradas en el proveedor

                                                            //Extrae las jurisdicciones IIBB que no pertenecen al proveedor
                                                            arrayJurisdicciones = extraerJurisdiccionesGenerales(objEstadoInscripcionJurIIBB, resultsNetosJurisdiccion);

                                                            //Se obtienen las jurisdicciones que están en la configuración general sin proveedor definido
                                                            if (!isEmpty(arrayJurisdicciones) && arrayJurisdicciones.length > 0) {
                                                                objRespuestaConfigJurisdiccionGeneral = getProveedorInscriptoRegimenIIBB(null, estadoExentoIIBB, arrayJurisdicciones, null, null, null, null, trandate);
                                                            }

                                                            // Se verifica si existen jurisdicciones que no estén en configuración general IIBB y en las jurisdicciones del proveedor.
                                                            if (!isEmpty(arrayJurisdicciones) && (arrayJurisdicciones.length > 0) && (!isEmpty(objRespuestaConfigJurisdiccionGeneral)) && (!isEmpty(objRespuestaConfigJurisdiccionGeneral.jurisdicciones)) && (objRespuestaConfigJurisdiccionGeneral.jurisdicciones.length <= 0)) {
                                                                mensajeJurisdiccionesNotValid += jurisdiccionesNotValid(objEstadoInscripcionJurIIBB, arrayJurisdicciones, resultsNetosJurisdiccion);
                                                            } else {
                                                                if (!isEmpty(objRespuestaConfigJurisdiccionGeneral) && !isEmpty(objRespuestaConfigJurisdiccionGeneral.jurisdicciones) && (objRespuestaConfigJurisdiccionGeneral.jurisdicciones.length > 0)) {
                                                                    for (var j = 0; j < objRespuestaConfigJurisdiccionGeneral.jurisdicciones.length; j++) {
                                                                        objEstadoInscripcionJurIIBB.jurisdicciones.push(objRespuestaConfigJurisdiccionGeneral.jurisdicciones[j]);
                                                                    }
                                                                    mensajeJurisdiccionesNotValid += jurisdiccionesNotValid(objEstadoInscripcionJurIIBB, arrayJurisdicciones, resultsNetosJurisdiccion);
                                                                }
                                                            }
                                                            //Fin --- Funcionalidad para caso donde se permita introducir en la Jurisdicción Única, jurisdicciones diferentes a las configuradas en el proveedor

                                                            log.audit("L54 - Calculo Retenciones", "LINE 495 - mensajeJurisdiccionesNotValid: " + mensajeJurisdiccionesNotValid);
                                                            log.audit("L54 - Calculo Retenciones", "LINE 496 - objEstadoInscripcionJurIIBB: " + JSON.stringify(objEstadoInscripcionJurIIBB.jurisdicciones));
                                                            // Obtengo los Codigos de Retencion de Cada Jurisdiccion
                                                            codigosRetencionIIBB = obtenerCodigosRetencionIIBB(entity, subsidiariaPago, objEstadoInscripcionJurIIBB, jurisdiccionesAgenteRetencion.idConfGeneral, importe_neto_factura_proveedor_a_pagar_total_ret_iibb, resultsNetosJurisdiccion, arrayFacturasJurisdiccionEntregaUnificado, existeFacturaSinJurisdiccionEntrega, tipoContribuyenteIVA, importe_bruto_total_facturas_iibb, jurisdiccionCordoba, importe_bruto_total_facturas_aliados, importeBrutoPago,id_posting_period);

                                                            if (!isEmpty(codigosRetencionIIBB) && !isEmpty(codigosRetencionIIBB.warning)) {
                                                                respuestaRetenciones.warning = true;
                                                                respuestaRetenciones.mensajeWarning.push(codigosRetencionIIBB.mensaje);
                                                            }
                                                        }
                                                    }

                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - calcularRetIIBB: " + JSON.stringify(calcularRetIIBB) + ", codigosRetencionIIBB: " + JSON.stringify(codigosRetencionIIBB) + " ** TIEMPO" + new Date());
                                                    log.audit("L54 - Calculo Retenciones", "LINE 507 - objEstadoInscripcionJurIIBB: " + JSON.stringify(objEstadoInscripcionJurIIBB));
                                                    log.audit("L54 - Calculo Retenciones", "LINE 508 - codigosRetencionIIBB: " + JSON.stringify(codigosRetencionIIBB));

                                                    if (calcularRetIIBB == false || (calcularRetIIBB == true && codigosRetencionIIBB != null && codigosRetencionIIBB.error == false)) {

                                                        var condicionesRetencion = getCondicion(entity);

                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - condicionesRetencion: " + JSON.stringify(condicionesRetencion) + " ** TIEMPO" + new Date());

                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - esAgenteRetencionGan: " + esAgenteRetencionGan + ", estaInscriptoRegimenGan: " + estaInscriptoRegimenGan + ", retencion_ganancias: " + JSON.stringify(retencion_ganancias) + ", retencion_ganancias.length: " + retencion_ganancias.length + " ** TIEMPO" + new Date());

                                                        log.audit("Governance Monitoring", "LINE 593 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        if (esAgenteRetencionGan) {

                                                            if (estaInscriptoRegimenGan) {

                                                                // JSALAZAR: 09/12/19 - INICIO - MANEJO DE IMPORTES Y MEJORAS PERFOMANCE RET. GANANCIAS
                                                                if (!isEmpty(retencion_ganancias) && retencion_ganancias.length > 0) {

                                                                    var arrayIdFacturasPagadas = [];
                                                                    var arrayIdFacturasPagadasMonotributos = [];
                                                                    var impBrutoPagosPasadosTotales = 0.0;
                                                                    var impPagosPasadosTotal = 0.0;
                                                                    var arrayCodRetGanancias = [];
                                                                    var arrayCodRetGananciasMonotributos = [];
                                                                    var esAnualizada = false;

                                                                    // INICIO - Extraccion de código de retenciones de ganancias
                                                                    for (var i = 0; i < retencion_ganancias.length; i++) {

                                                                        var resultGananciaMonotributo = paramRetenciones.filter(function (obj) {
                                                                            return (obj.codigo == retencion_ganancias[i].codigo && obj.tipoContGAN.split(",").includes(tipoContGAN) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                        });

                                                                        var esGanMonotributo = false;
                                                                        if (!isEmpty(resultGananciaMonotributo) && resultGananciaMonotributo.length > 0) {
                                                                            esGanMonotributo = resultGananciaMonotributo[0].ganMonotributo;
                                                                        }

                                                                        if (esGanMonotributo) {
                                                                            arrayCodRetGananciasMonotributos.push(retencion_ganancias[i].codigo);
                                                                        } else {
                                                                            arrayCodRetGanancias.push(retencion_ganancias[i].codigo);
                                                                        }
                                                                    }
                                                                    // FIN - Extraccion de código de retenciones de ganancias

                                                                    // Se obtiene el detalle de las facturas pagas en el periodo de la VP que se está ejecutando (sirve para las que son mensuales)
                                                                    var resultPagosPasadosCodRet = getImpFacturasPagas(entity, trandate, subsidiariaPago, arrayCodRetGanancias, "gan", esAnualizada, id_posting_period);
                                                                    resultPagosPasadosCodRet = JSON.parse(resultPagosPasadosCodRet);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 648 - Despues de llamar a getImpFacturasPagas - resultPagosPasadosCodRet: " + JSON.stringify(resultPagosPasadosCodRet) + " ** TIEMPO" + new Date());

                                                                    // Se verifica que existan pagos realizados anteriormente para ese periodo
                                                                    if (!isEmpty(resultPagosPasadosCodRet) && resultPagosPasadosCodRet.length > 0) {
                                                                        for (var j = 0; j < resultPagosPasadosCodRet.length; j++) {
                                                                            arrayIdFacturasPagadas.push(resultPagosPasadosCodRet[j].idInterno);
                                                                        }

                                                                        // Se obtienen los pagos anteriores al periodo fiscal indicado en la vendor payment, para saber que porcentaje de las facturas a pagar ha sido pagado anteriormente
                                                                        var resultsPagPasFact = calcularImportesBrutosPagosPasados(entity, arrayIdFacturasPagadas, subsidiariaPago, trandate, esAnualizada);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 648 - Despues de llamar a calcularImportesBrutosPagosPasados - resultsPagPasFact: " + JSON.stringify(resultsPagPasFact) + " ** TIEMPO" + new Date());

                                                                        // Se obtienen los importes netos de las facturas a pagar
                                                                        var arrayFacturasImpNetoPagar = obtener_arreglo_netos_vendorbill_moneda_local(entity, arrayIdFacturasPagadas, subsidiariaPago, false, esONG);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 650 - Despues de llamar a obtener_arreglo_netos_vendorbill_moneda_local - arrayFacturasImpNetoPagar: " + JSON.stringify(arrayFacturasImpNetoPagar) + " ** TIEMPO" + new Date());

                                                                        // Se obtienen los importes brutos de las facturas a pagar
                                                                        var arrayFacturaImpBrutoPagar = obtener_arreglo_codigos_ret_vendorbill_moneda_local(entity, arrayIdFacturasPagadas, subsidiariaPago, esONG);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 652 - Despues de llamar a obtener_arreglo_codigos_ret_vendorbill_moneda_local - arrayFacturaImpBrutoPagar: " + JSON.stringify(arrayFacturaImpBrutoPagar) + " ** TIEMPO" + new Date());

                                                                        for (var j = 0; j < resultPagosPasadosCodRet.length; j++) {
                                                                            resultPagosPasadosCodRet[j].importeNeto = 0.0;
                                                                            for (var k = 0; k < arrayFacturasImpNetoPagar.length; k++) {
                                                                                if (arrayFacturasImpNetoPagar[k].idInterno == resultPagosPasadosCodRet[j].idInterno) {
                                                                                    resultPagosPasadosCodRet[j].importeNeto = arrayFacturasImpNetoPagar[k].importe;
                                                                                }
                                                                            }
                                                                        }

                                                                        for (var j = 0; j < resultPagosPasadosCodRet.length; j++) {
                                                                            resultPagosPasadosCodRet[j].importeBruto = 0.0;
                                                                            for (var k = 0; k < arrayFacturaImpBrutoPagar.length; k++) {
                                                                                if (arrayFacturaImpBrutoPagar[k].idInterno == resultPagosPasadosCodRet[j].idInterno) {
                                                                                    resultPagosPasadosCodRet[j].importeBruto = arrayFacturaImpBrutoPagar[k].importeTotal;
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 683 - resultPagosPasadosCodRet: " + JSON.stringify(resultPagosPasadosCodRet) + " ** TIEMPO" + new Date());

                                                                    // Se obtiene el detalle de las facturas pagas en el periodo de la VP que se está ejecutando (sirve para las que son anualizadas)
                                                                    esAnualizada = true;
                                                                    var resultPagosPasadosCodRetMonotributos = getImpFacturasPagas(entity, trandate, subsidiariaPago, arrayCodRetGananciasMonotributos, "gan", esAnualizada, id_posting_period);
                                                                    resultPagosPasadosCodRetMonotributos = JSON.parse(resultPagosPasadosCodRetMonotributos);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 691 - Despues de llamar a getImpFacturasPagas - resultPagosPasadosCodRetMonotributos: " + JSON.stringify(resultPagosPasadosCodRetMonotributos) + " ** TIEMPO" + new Date());

                                                                    // Se verifica que existan pagos realizados anteriormente para ese periodo
                                                                    if (!isEmpty(resultPagosPasadosCodRetMonotributos) && resultPagosPasadosCodRetMonotributos.length > 0) {
                                                                        for (var j = 0; j < resultPagosPasadosCodRetMonotributos.length; j++) {
                                                                            arrayIdFacturasPagadasMonotributos.push(resultPagosPasadosCodRetMonotributos[j].idInterno);
                                                                        }

                                                                        // Se obtienen los pagos anteriores al periodo fiscal indicado en la vendor payment, para saber que porcentaje de las facturas a pagar ha sido pagado anteriormente
                                                                        var resultsPagPasFactMonotributos = calcularImportesBrutosPagosPasados(entity, arrayIdFacturasPagadasMonotributos, subsidiariaPago, trandate, esAnualizada);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 773 - Despues de llamar a calcularImportesBrutosPagosPasados - resultsPagPasFactMonotributos: " + JSON.stringify(resultsPagPasFactMonotributos) + " ** TIEMPO" + new Date());

                                                                        // Se obtienen los importes netos de las facturas a pagar
                                                                        var arrayFacturasImpNetoPagar = obtener_arreglo_netos_vendorbill_moneda_local(entity, arrayIdFacturasPagadasMonotributos, subsidiariaPago, false, esONG);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 777 - Despues de llamar a obtener_arreglo_netos_vendorbill_moneda_local - arrayFacturasImpNetoPagar: " + JSON.stringify(arrayFacturasImpNetoPagar) + " ** TIEMPO" + new Date());

                                                                        // Se obtienen los importes brutos de las facturas a pagar
                                                                        var arrayFacturaImpBrutoPagar = obtener_arreglo_codigos_ret_vendorbill_moneda_local(entity, arrayIdFacturasPagadasMonotributos, subsidiariaPago, esONG);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 781 - Despues de llamar a obtener_arreglo_codigos_ret_vendorbill_moneda_local - arrayFacturaImpBrutoPagar: " + JSON.stringify(arrayFacturaImpBrutoPagar) + " ** TIEMPO" + new Date());

                                                                        for (var j = 0; j < resultPagosPasadosCodRetMonotributos.length; j++) {
                                                                            resultPagosPasadosCodRetMonotributos[j].importeNeto = 0.0;
                                                                            for (var k = 0; k < arrayFacturasImpNetoPagar.length; k++) {
                                                                                if (arrayFacturasImpNetoPagar[k].idInterno == resultPagosPasadosCodRetMonotributos[j].idInterno) {
                                                                                    resultPagosPasadosCodRetMonotributos[j].importeNeto = arrayFacturasImpNetoPagar[k].importe;
                                                                                }
                                                                            }
                                                                        }

                                                                        for (var j = 0; j < resultPagosPasadosCodRetMonotributos.length; j++) {
                                                                            resultPagosPasadosCodRetMonotributos[j].importeBruto = 0.0;
                                                                            for (var k = 0; k < arrayFacturaImpBrutoPagar.length; k++) {
                                                                                if (arrayFacturaImpBrutoPagar[k].idInterno == resultPagosPasadosCodRetMonotributos[j].idInterno) {
                                                                                    resultPagosPasadosCodRetMonotributos[j].importeBruto = arrayFacturaImpBrutoPagar[k].importeTotal;
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 683 - resultPagosPasadosCodRetMonotributos: " + JSON.stringify(resultPagosPasadosCodRetMonotributos) + " ** TIEMPO" + new Date());

                                                                    // INICIO -- Obtencion de Importes Retenidos por Periodo y por Codigos de Retención a procesar (sirve para las que son mensuales)
                                                                    esAnualizada = false;
                                                                    var arrayImpRetenidosAnteriores = getImpRetenido(entity, id_posting_period, arrayCodRetGanancias, moneda, subsidiariaPago, esAnualizada, trandate);
                                                                    arrayImpRetenidosAnteriores = JSON.parse(arrayImpRetenidosAnteriores);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 689 - Despues de llamar a getImpRetenido - arrayImpRetenidosAnteriores: " + JSON.stringify(arrayImpRetenidosAnteriores) + " ** TIEMPO" + new Date());
                                                                    // FIN -- Obtencion de Importes Retenidos por Periodo y por Codigos de Retención a procesar (sirve para las que son mensuales)

                                                                    // Se obtienen las bases de cálculo de las retenciones calculadas, acumuladas y agrupadas por código de retención (sirve para las que son mensuales)
                                                                    var arrayBaseCalcPagosRetenidos = getImpPagosPasadosCodRetencion(entity, id_posting_period, subsidiariaPago, arrayCodRetGanancias, "GAN", esAnualizada, trandate);
                                                                    arrayBaseCalcPagosRetenidos = JSON.parse(arrayBaseCalcPagosRetenidos);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 697 - Despues de llamar a getImpPagosPasadosCodRetencion - arrayBaseCalcPagosRetenidos: " + JSON.stringify(arrayBaseCalcPagosRetenidos) + " ** TIEMPO" + new Date());

                                                                    // INICIO -- Obtencion de Importes Retenidos por Periodo y por Codigos de Retención a procesar (sirve para las que son anualizadas)
                                                                    esAnualizada = true;
                                                                    var arrayImpRetenidosAnterioresAnuales = getImpRetenido(entity, id_posting_period, arrayCodRetGananciasMonotributos, moneda, subsidiariaPago, esAnualizada, trandate);
                                                                    arrayImpRetenidosAnterioresAnuales = JSON.parse(arrayImpRetenidosAnterioresAnuales);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 703 - Despues de llamar a getImpRetenido - arrayImpRetenidosAnterioresAnuales: " + JSON.stringify(arrayImpRetenidosAnterioresAnuales) + " ** TIEMPO" + new Date());
                                                                    // FIN -- Obtencion de Importes Retenidos por Periodo y por Codigos de Retención a procesar (sirve para las que son anualizadas)

                                                                    // Se obtienen las bases de cálculo de las retenciones calculadas, acumuladas y agrupadas por código de retención (sirve para las que son anualizadas)
                                                                    var arrayBaseCalcPagosRetenidosMonotributos = getImpPagosPasadosCodRetencion(entity, id_posting_period, subsidiariaPago, arrayCodRetGananciasMonotributos, "GAN", esAnualizada, trandate);
                                                                    arrayBaseCalcPagosRetenidosMonotributos = JSON.parse(arrayBaseCalcPagosRetenidosMonotributos);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 709 - Despues de llamar a getImpPagosPasadosCodRetencion - arrayBaseCalcPagosRetenidosMonotributos: " + JSON.stringify(arrayBaseCalcPagosRetenidosMonotributos) + " ** TIEMPO" + new Date());
                                                                }
                                                                // JSALAZAR: 09/12/19 - FIN - MANEJO DE IMPORTES Y MEJORAS PERFOMANCE RET. GANANCIAS

                                                                // Por cada Codigo de Retencion se va calculando y acumulando la retencion
                                                                for (var i = 0; i < retencion_ganancias.length; i++) {

                                                                    var considerarImportesRetAnterior = true;
                                                                    // NUEVO Si es Factura M , buscar el codigo de Retencion de Factura M
                                                                    //if(!isEmpty(retencion_ganancias[i].esFacturaM) && retencion_ganancias[i].esFacturaM==true && parseFloat(retencion_ganancias[i].imp_neto_factura,10)>=1000){
                                                                    if (!isEmpty(retencion_ganancias[i].esFacturaM) && retencion_ganancias[i].esFacturaM == true) {

                                                                        // Busco el Codigo de Retencion de Ganancias de Factura M
                                                                        //var codigoRetencionM=buscarCodigoRetencionM(1,subsidiariaPago); // 1 - GANANCIAS
                                                                        //if(!isEmpty(codigoRetencionMGanancias) && codigoRetencionMGanancias.length>0){
                                                                        if (!isEmpty(retencion_ganancias[i].codigo)) {
                                                                            //retencion_ganancias[i].codigo=codigoRetencionMGanancias[0].codigo;

                                                                            // Se extrae el monto retenido anterior para el periodo que se realiza la Vendor payment
                                                                            var esAnualizada = false;
                                                                            retencion_ganancias[i].imp_retenido_anterior = 0.0;

                                                                            var objImporteRetenidoAnterior = arrayImpRetenidosAnteriores.filter(function (obj) {
                                                                                return (obj.codigoRetencion == retencion_ganancias[i].codigo);
                                                                            });

                                                                            if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                retencion_ganancias[i].imp_retenido_anterior = parseFloat(objImporteRetenidoAnterior[0].imp_retenido, 10);
                                                                            }

                                                                            log.debug("L54 - Calculo Retenciones", "LINE 904 - CALCULARETENCIONES - Retenciones Gan M - retencion_ganancias[i].imp_retenido_anterior: " + retencion_ganancias[i].imp_retenido_anterior + " ** TIEMPO" + new Date());

                                                                            var impBrutoPagosPasadosTotales = 0.0;
                                                                            var impPagosPasadosTotal = 0.0;

                                                                            var objPagosPasadosCodRet = resultPagosPasadosCodRet.filter(function (obj) {
                                                                                return (obj.codigoRetGanancias == retencion_ganancias[i].codigo);
                                                                            });

                                                                            if (!isEmpty(objPagosPasadosCodRet) && objPagosPasadosCodRet.length > 0) {
                                                                                // Se determina el total de importes brutos pagados anteriormente para cada factura, y así calcular bien su importe neto a pagar total
                                                                                if (!isEmpty(resultsPagPasFact) && resultsPagPasFact.length > 0) {

                                                                                    for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                        // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                        if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                            var impBrutoFactPagosPasados = parseFloat(obtener_imp_factura_pasado_pagada(resultsPagPasFact, objPagosPasadosCodRet[j].idInterno), 10);
                                                                                            var impBrutoTotalFactPagar = parseFloat(impBrutoFactPagosPasados, 10) + parseFloat(objPagosPasadosCodRet[j].importe, 10); // sumo el importe que ya ha sido pagado anteriormente con el que se quiere pagar ahora
                                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 696 - Retenciones M - objPagosPasadosCodRet[j].idInterno: " + objPagosPasadosCodRet[j].idInterno + " - impBrutoFactPagosPasados: " + impBrutoFactPagosPasados + " - objPagosPasadosCodRet[j].importe: " + objPagosPasadosCodRet[j].importe + " - impBrutoTotalFactPagar: " + impBrutoTotalFactPagar + " - objPagosPasadosCodRet[j]: " + JSON.stringify(objPagosPasadosCodRet[j]) + " - ** TIEMPO" + new Date());
                                                                                            // Se verifica si la suma de importes brutos de pagos pasados excede el importe bruto de la factura a pagar, esto se hace para no tomar en cuenta el monto en la base de calculo y asignarle 0
                                                                                            if (parseFloat(Math.abs(impBrutoFactPagosPasados), 10) >= parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                impBrutoPagosPasadosTotales = 0.0;
                                                                                            } else {
                                                                                                // Se verifica si la suma de los importes brutos pagados anteriormente + el nuevo importe bruto de la factura a pagar sobrepasa el importe bruto total de la factura a pagar
                                                                                                // Si lo sobrepasa, entonces al importe de la factura a pagar le asigno lo que resta de pago permitido para esa factura, este caso es para cuando existen líneas de iva no gravado y no las toma en cuenta
                                                                                                // De esta manera no se excede el pago de una factura de su importe bruto permitido
                                                                                                if (parseFloat(Math.abs(impBrutoTotalFactPagar), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                    impBrutoPagosPasadosTotales = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) - parseFloat(impBrutoFactPagosPasados, 10), 10);
                                                                                                } else {
                                                                                                    impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                                }
                                                                                            }
                                                                                            var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                            impPagosPasadosTotal += parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 713 - Retenciones Gan M - impPagosPasadosTotal: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                        }
                                                                                    }
                                                                                } else {
                                                                                    for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                        // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                        if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                            if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importe), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importeBruto, 10);
                                                                                            } else {
                                                                                                impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                            }

                                                                                            var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                            impPagosPasadosTotal += parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 773 - impPagosPasadosTotal: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }

                                                                            var resultMinNoImponible = paramRetenciones.filter(function (obj) {
                                                                                return (obj.codigo == retencion_ganancias[i].codigo && obj.tipoContGAN.split(",").includes(tipoContGAN) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                            });

                                                                            log.debug("L54 - Calculo Retenciones", "LINE 958 - CALCULARETENCIONES - Retenciones Gan M - resultMinNoImponible: " + JSON.stringify(resultMinNoImponible) + " ** TIEMPO" + new Date());

                                                                            if (!isEmpty(resultMinNoImponible) && resultMinNoImponible.length > 0) {
                                                                                var minimoNoImponible = resultMinNoImponible[0].minNoImponible;
                                                                            } else {
                                                                                var minimoNoImponible = 0;
                                                                            }

                                                                            // Se extrae el total de las bases de cálculo de las retenciones para el codigo de retención enviado por parámetro en el periodo fiscal
                                                                            var baseCalcPagosRetenidosGAN = 0.0;

                                                                            var objImporteRetenidoAnterior = arrayBaseCalcPagosRetenidos.filter(function (obj) {
                                                                                return (obj.codigoRetencion == retencion_ganancias[i].codigo);
                                                                            });

                                                                            if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                baseCalcPagosRetenidosGAN = parseFloat(objImporteRetenidoAnterior[0].importe, 10);
                                                                            }

                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 869 - baseCalcPagosRetenidosGAN: " + baseCalcPagosRetenidosGAN + " - es anualizada: " + esAnualizada + " ** TIEMPO" + new Date());
                                                                            impPagosPasadosTotal = parseFloat(numberTruncTwoDec(impPagosPasadosTotal), 10);
                                                                            baseCalcPagosRetenidosGAN = parseFloat(numberTruncTwoDec(baseCalcPagosRetenidosGAN), 10);

                                                                            retencion_ganancias[i].base_calculo_retencion = parseFloat(retencion_ganancias[i].importe_factura_pagar, 10) + parseFloat(impPagosPasadosTotal, 10) - parseFloat(minimoNoImponible, 10);
                                                                            log.debug("L54 - Calculo Retenciones", "LINE 982 - CALCULARETENCIONES - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                            log.debug("L54 - Calculo Retenciones", "LINE 983 - CALCULARETENCIONES - Valores - Pagos Pasados: " + impPagosPasadosTotal + ", Importe Factura: " + retencion_ganancias[i].importe_factura_pagar + ", Tipo Cambio: " + tasa_cambio_pago + ", Importe Retenido Anterior : " + retencion_ganancias[i].imp_retenido_anterior + " ** TIEMPO" + new Date());

                                                                            var diferenciaBaseCalculoPagado = Math.abs(impPagosPasadosTotal - (baseCalcPagosRetenidosGAN + parseFloat(minimoNoImponible, 10)));
                                                                            // var existeDiferenciaBaseCalculo = true;

                                                                            /* if ((parseFloat(diferenciaBaseCalculoPagado, 10) == 0.00) || ((parseFloat(diferenciaBaseCalculoPagado, 10) >= 0.00) && (parseFloat(diferenciaBaseCalculoPagado, 10) <= 0.05))) { // marguen de diferencia
                                                                                // Base calculo en moneda de transaccion, sin redondear
                                                                                // retencion_ganancias[i].base_calculo_retencion = parseFloat(parseFloat(retencion_ganancias[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosGAN, 10), 10);
                                                                                retencion_ganancias[i].base_calculo_retencion = parseFloat(retencion_ganancias[i].importe_factura_pagar, 10);
                                                                                // Base calculo impresión en moneda de transaccion, sin redondear
                                                                                retencion_ganancias[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosGAN, 10) + parseFloat(retencion_ganancias[i].base_calculo_retencion, 10), 10);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 872 - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " - retencion_ganancias[i].base_calculo_retencion_impresion: " + retencion_ganancias[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());
                                                                                baseCalcPagosRetenidosGAN = 0.00;
                                                                                retencion_ganancias[i].imp_retenido_anterior = 0.00;
                                                                                existeDiferenciaBaseCalculo = false;
                                                                            } */

                                                                            // log.debug("L54 - Calculo Retenciones", "LINE 999 - CALCULARETENCIONES - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                            // log.debug("L54 - Calculo Retenciones", "LINE 1000 - CALCULARETENCIONES - Pagos Pasados: " + JSON.stringify(objPagosPasadosCodRet) + " - Importe Factura: " + retencion_ganancias[i].importe_factura_pagar + " - Tipo Cambio: " + tasa_cambio_pago + " Importe Retenido Anterior : " + retencion_ganancias[i].imp_retenido_anterior + " - impPagosPasadosTotal: " + impPagosPasadosTotal + " - ** TIEMPO" + new Date());

                                                                            // var objRetencionGAN = getRetencion(entity, "gan", retencion_ganancias[i].codigo, retencion_ganancias[i].base_calculo_retencion, id_posting_period, retencion_ganancias[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_ganancias[i].nombreRetencion, baseCalcPagosRetenidosGAN);
                                                                            var objRetencionGAN = getRetencion(entity, "gan", retencion_ganancias[i].codigo, retencion_ganancias[i].base_calculo_retencion, id_posting_period, retencion_ganancias[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_ganancias[i].nombreRetencion, 0);
                                                                            log.debug("L54 - Calculo Retenciones", "LINE 1003 - CALCULARETENCIONES  - objRetencionGAN: " + JSON.stringify(objRetencionGAN) + " ** TIEMPO" + new Date());
                                                                            retencion_ganancias[i].importe_retencion = objRetencionGAN.importeRetencion;
                                                                            retencion_ganancias[i].importe_retencion = parseFloat(retencion_ganancias[i].importe_retencion, 10); // En Moneda Base

                                                                            // Base calculo en moneda de transaccion, sin redondear
                                                                            // Se comenta para que se informe la base de cálculo acumulada como base de cálculo 
                                                                            // retencion_ganancias[i].base_calculo_retencion = parseFloat(parseFloat(retencion_ganancias[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosGAN, 10), 10);

                                                                            // Base calculo impresión en moneda de transaccion, sin redondear
                                                                            // if (existeDiferenciaBaseCalculo) {
                                                                            // retencion_ganancias[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosGAN, 10) + parseFloat(retencion_ganancias[i].base_calculo_retencion, 10), 10);
                                                                            retencion_ganancias[i].base_calculo_retencion_impresion = parseFloat(retencion_ganancias[i].base_calculo_retencion, 10);
                                                                            // }
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 872 - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " - retencion_ganancias[i].base_calculo_retencion_impresion: " + retencion_ganancias[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());

                                                                            // Nuevo - Alicuota Retencion
                                                                            retencion_ganancias[i].alicuota = parseFloat(objRetencionGAN.alicuotaRetencion, 10); // Alicuota sin redondear
                                                                            log.debug("L54 - Calculo Retenciones", "LINE 1018 - CALCULARETENCIONES - retencion_ganancias[i].alicuota: " + retencion_ganancias[i].alicuota + " ** TIEMPO" + new Date());
                                                                            log.debug("L54 - Calculo Retenciones", "LINE 1019 - CALCULARETENCIONES - Importe Retencion: " + retencion_ganancias[i].importe_retencion + " ** TIEMPO" + new Date());

                                                                            if (objRetencionGAN.warning) {
                                                                                respuestaRetenciones.warning = true;
                                                                                respuestaRetenciones.mensajeWarning.push(objRetencionGAN.mensaje);
                                                                            }

                                                                        }
                                                                        else {
                                                                            respuestaRetenciones.warning = true;
                                                                            respuestaRetenciones.mensajeWarning.push("No se calculará la Retencion de Ganancias de Factura M debido a que no se encuentra configurada la Retencion");
                                                                            log.debug("L54 - Calculo Retenciones", "LINE 1030 - CALCULARETENCIONES  - No se calculará la Retencion de Ganancias de Factura M debido a que no se encuentra configurada la Retencion");
                                                                            respuestaRetenciones.importeRetencion = 0;
                                                                            respuestaRetenciones.alicuotaRetencion = 0;
                                                                        }


                                                                    }
                                                                    else {
                                                                        //PROBAR ESTE BLOQUE CON FACTURA DISTINTA DE M

                                                                        if (!isEmpty(retencion_ganancias[i].codigo)) {

                                                                            var resultGananciaMonotributo = paramRetenciones.filter(function (obj) {
                                                                                return (obj.codigo == retencion_ganancias[i].codigo && obj.tipoContGAN.split(",").includes(tipoContGAN) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                            });

                                                                            log.debug("L54 - Calculo Retenciones", "LINE 1046 - CALCULARETENCIONES - resultGananciaMonotributo: " + JSON.stringify(resultGananciaMonotributo) + " ** TIEMPO" + new Date());

                                                                            var esGanMonotributo = false;
                                                                            if (!isEmpty(resultGananciaMonotributo) && resultGananciaMonotributo.length > 0) {
                                                                                esGanMonotributo = resultGananciaMonotributo[0].ganMonotributo;
                                                                            }

                                                                            log.debug("L54 - Calculo Retenciones", "LINE 1053 - CALCULARETENCIONES - esGanMonotributo: " + JSON.stringify(esGanMonotributo) + " ** TIEMPO" + new Date());

                                                                            //if (es_ganancias_monotributo(retencion_ganancias[i].codigo)) {
                                                                            if (esGanMonotributo) {

                                                                                var esAnualizada = true;
                                                                                // Se extrae el monto retenido anterior para el periodo que se realiza la Vendor payment
                                                                                retencion_ganancias[i].imp_retenido_anterior = 0.0;

                                                                                var objImporteRetenidoAnterior = arrayImpRetenidosAnterioresAnuales.filter(function (obj) {
                                                                                    return (obj.codigoRetencion == retencion_ganancias[i].codigo);
                                                                                });

                                                                                if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                    retencion_ganancias[i].imp_retenido_anterior = parseFloat(objImporteRetenidoAnterior[0].imp_retenido, 10);
                                                                                }

                                                                                log.debug("L54 - Calculo Retenciones", "LINE 1070 - CALCULARETENCIONES - Retenciones Gan Monotributo - retencion_ganancias[i].imp_retenido_anterior: " + retencion_ganancias[i].imp_retenido_anterior + " ** TIEMPO" + new Date());

                                                                                var impBrutoPagosPasadosTotales = 0.0;
                                                                                var impPagosPasadosTotal = 0.0;

                                                                                var objPagosPasadosCodRet = resultPagosPasadosCodRetMonotributos.filter(function (obj) {
                                                                                    return (obj.codigoRetGanancias == retencion_ganancias[i].codigo);
                                                                                });

                                                                                if (!isEmpty(objPagosPasadosCodRet) && objPagosPasadosCodRet.length > 0) {
                                                                                    // Se determina el total de importes brutos pagados anteriormente para cada factura, y así calcular bien su importe neto a pagar total
                                                                                    if (!isEmpty(resultsPagPasFactMonotributos) && resultsPagPasFactMonotributos.length > 0) {

                                                                                        for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                            // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                            if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                                var impBrutoFactPagosPasados = parseFloat(obtener_imp_factura_pasado_pagada(resultsPagPasFactMonotributos, objPagosPasadosCodRet[j].idInterno), 10);
                                                                                                var impBrutoTotalFactPagar = parseFloat(impBrutoFactPagosPasados, 10) + parseFloat(objPagosPasadosCodRet[j].importe, 10); // sumo el importe que ya ha sido pagado anteriormente con el que se quiere pagar ahora
                                                                                                log.debug("L54 - Calculo Retenciones", "LINE 1086 - CALCULARETENCIONES - line 945 - objPagosPasadosCodRet[j].idInterno: " + objPagosPasadosCodRet[j].idInterno + " - impBrutoFactPagosPasados: " + impBrutoFactPagosPasados + " - objPagosPasadosCodRet[j].importe: " + objPagosPasadosCodRet[j].importe + " - impBrutoTotalFactPagar: " + impBrutoTotalFactPagar + " - objPagosPasadosCodRet[j]: " + JSON.stringify(objPagosPasadosCodRet[j]) + " - ** TIEMPO" + new Date());

                                                                                                // Se verifica si la suma de importes brutos de pagos pasados excede el importe bruto de la factura a pagar, esto se hace para no tomar en cuenta el monto en la base de calculo y asignarle 0
                                                                                                if (parseFloat(Math.abs(impBrutoFactPagosPasados), 10) >= parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                    impBrutoPagosPasadosTotales = 0.0;
                                                                                                } else {
                                                                                                    // Se verifica si la suma de los importes brutos pagados anteriormente + el nuevo importe bruto de la factura a pagar sobrepasa el importe bruto total de la factura a pagar
                                                                                                    // Si lo sobrepasa, entonces al importe de la factura a pagar le asigno lo que resta de pago permitido para esa factura, este caso es para cuando existen líneas de iva no gravado y no las toma en cuenta
                                                                                                    // De esta manera no se excede el pago de una factura de su importe bruto permitido
                                                                                                    if (parseFloat(Math.abs(impBrutoTotalFactPagar), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                        impBrutoPagosPasadosTotales = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) - parseFloat(impBrutoFactPagosPasados, 10), 10);
                                                                                                    } else {
                                                                                                        impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                                    }
                                                                                                }
                                                                                                var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                                impPagosPasadosTotal += parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 962 - impPagosPasadosTotal: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                            }
                                                                                        }
                                                                                    } else {
                                                                                        for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                            // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                            if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                                if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importe), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                    impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importeBruto, 10);
                                                                                                } else {
                                                                                                    impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                                }

                                                                                                var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                                impPagosPasadosTotal += parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 974 - impPagosPasadosTotal: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }

                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 979 - Retenciones Gan Monotributo - getImpFacturasPagas - objPagosPasadosCodRet: " + JSON.stringify(objPagosPasadosCodRet) + " ** TIEMPO" + new Date());

                                                                                var resultMinNoImponible = paramRetenciones.filter(function (obj) {
                                                                                    return (obj.codigo == retencion_ganancias[i].codigo && obj.tipoContGAN.split(",").includes(tipoContGAN) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                                });

                                                                                log.debug("L54 - Calculo Retenciones", "LINE 1126 - CALCULARETENCIONES - resultMinNoImponible: " + JSON.stringify(resultMinNoImponible));

                                                                                if (!isEmpty(resultMinNoImponible) && resultMinNoImponible.length > 0) {
                                                                                    var minimoNoImponible = resultMinNoImponible[0].minNoImponible;
                                                                                } else {
                                                                                    var minimoNoImponible = 0;
                                                                                }

                                                                                // Se extrae el total de las bases de cálculo de las retenciones para el codigo de retención enviado por parámetro en el periodo fiscal
                                                                                var baseCalcPagosRetenidosGAN = 0.0;

                                                                                var objImporteRetenidoAnterior = arrayBaseCalcPagosRetenidosMonotributos.filter(function (obj) {
                                                                                    return (obj.codigoRetencion == retencion_ganancias[i].codigo);
                                                                                });

                                                                                if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                    baseCalcPagosRetenidosGAN = parseFloat(objImporteRetenidoAnterior[0].importe, 10);
                                                                                }

                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1015 - baseCalcPagosRetenidosGAN: " + baseCalcPagosRetenidosGAN + " - es anualizada: " + esAnualizada + " ** TIEMPO" + new Date());
                                                                                impPagosPasadosTotal = parseFloat(numberTruncTwoDec(impPagosPasadosTotal), 10);
                                                                                baseCalcPagosRetenidosGAN = parseFloat(numberTruncTwoDec(baseCalcPagosRetenidosGAN), 10);

                                                                                retencion_ganancias[i].base_calculo_retencion = parseFloat(retencion_ganancias[i].importe_factura_pagar, 10) + parseFloat(impPagosPasadosTotal, 10) - parseFloat(minimoNoImponible, 10);
                                                                                log.debug("L54 - Calculo Retenciones", "LINE 1150 - CALCULARETENCIONES - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                                log.debug("L54 - Calculo Retenciones", "LINE 1151 - CALCULARETENCIONES - Pagos Pasados: " + JSON.stringify(objPagosPasadosCodRet) + " - Importe Factura: " + retencion_ganancias[i].importe_factura_pagar + " - Tipo Cambio: " + tasa_cambio_pago + " Importe Retenido Anterior : " + retencion_ganancias[i].imp_retenido_anterior + " - impPagosPasadosTotal: " + impPagosPasadosTotal + " - ** TIEMPO" + new Date());

                                                                                var diferenciaBaseCalculoPagado = Math.abs(impPagosPasadosTotal - (baseCalcPagosRetenidosGAN + parseFloat(minimoNoImponible, 10)));
                                                                                // var existeDiferenciaBaseCalculo = true;

                                                                                /* if ((parseFloat(diferenciaBaseCalculoPagado, 10) == 0.00) || ((parseFloat(diferenciaBaseCalculoPagado, 10) >= 0.00) && (parseFloat(diferenciaBaseCalculoPagado, 10) <= 0.05))) { // marguen de diferencia
                                                                                    // Base calculo en moneda de transaccion, sin redondear
                                                                                    // retencion_ganancias[i].base_calculo_retencion = parseFloat(parseFloat(retencion_ganancias[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosGAN, 10), 10);
                                                                                    retencion_ganancias[i].base_calculo_retencion = parseFloat(retencion_ganancias[i].importe_factura_pagar, 10);
                                                                                    // Base calculo impresión en moneda de transaccion, sin redondear
                                                                                    retencion_ganancias[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosGAN, 10) + parseFloat(retencion_ganancias[i].base_calculo_retencion, 10), 10);
                                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1018 - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " - retencion_ganancias[i].base_calculo_retencion_impresion: " + retencion_ganancias[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());
                                                                                    baseCalcPagosRetenidosGAN = 0.00;
                                                                                    retencion_ganancias[i].imp_retenido_anterior = 0.00;
                                                                                    existeDiferenciaBaseCalculo = false;
                                                                                } */

                                                                                // log.debug("L54 - Calculo Retenciones", "LINE 1167 - CALCULARETENCIONES - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                                // log.debug("L54 - Calculo Retenciones", "LINE 1168 - CALCULARETENCIONES - Pagos Pasados: " + JSON.stringify(objPagosPasadosCodRet) + " - Importe Factura: " + retencion_ganancias[i].importe_factura_pagar + " - Tipo Cambio: " + tasa_cambio_pago + " Importe Retenido Anterior : " + retencion_ganancias[i].imp_retenido_anterior + " - impPagosPasadosTotal: " + impPagosPasadosTotal + " - ** TIEMPO" + new Date());

                                                                                // var objRetencionGAN = getRetencion(entity, "gan", retencion_ganancias[i].codigo, retencion_ganancias[i].base_calculo_retencion, id_posting_period, retencion_ganancias[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_ganancias[i].nombreRetencion, baseCalcPagosRetenidosGAN);
                                                                                var objRetencionGAN = getRetencion(entity, "gan", retencion_ganancias[i].codigo, retencion_ganancias[i].base_calculo_retencion, id_posting_period, retencion_ganancias[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_ganancias[i].nombreRetencion, 0);
                                                                                log.debug("L54 - Calculo Retenciones", "LINE 1171 - CALCULARETENCIONES - objRetencionGAN: " + JSON.stringify(objRetencionGAN) + " ** TIEMPO" + new Date());
                                                                                retencion_ganancias[i].importe_retencion = objRetencionGAN.importeRetencion;
                                                                                retencion_ganancias[i].importe_retencion = parseFloat(retencion_ganancias[i].importe_retencion, 10); // En Moneda Base

                                                                                // Base calculo en moneda de transaccion, sin redondear
                                                                                // retencion_ganancias[i].base_calculo_retencion = parseFloat(parseFloat(retencion_ganancias[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosGAN, 10), 10);

                                                                                // Base calculo impresión en moneda de transaccion, sin redondear
                                                                                // if (existeDiferenciaBaseCalculo) {
                                                                                // retencion_ganancias[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosGAN, 10) + parseFloat(retencion_ganancias[i].base_calculo_retencion, 10), 10);
                                                                                retencion_ganancias[i].base_calculo_retencion_impresion = parseFloat(retencion_ganancias[i].base_calculo_retencion, 10);
                                                                                // }
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1018 - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " - retencion_ganancias[i].base_calculo_retencion_impresion: " + retencion_ganancias[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());

                                                                                // Nuevo - Alicuota Retencion
                                                                                retencion_ganancias[i].alicuota = parseFloat(objRetencionGAN.alicuotaRetencion, 10); // Alicuota sin redondear
                                                                                log.debug("L54 - Calculo Retenciones", "LINE 1186 - CALCULARETENCIONES - retencion_ganancias[i].alicuota: " + retencion_ganancias[i].alicuota + " ** TIEMPO" + new Date());

                                                                            } else {

                                                                                if (retencion_ganancias[i].esRetManual) {

                                                                                    log.debug("L54 - Calculo Retenciones", "LINE 1192 - CALCULARETENCIONES - Ingreso a código de Retención Manual, nombre: " + retencion_ganancias[i].nombreRetencion + " - ** TIEMPO" + new Date());
                                                                                    var considerarImportesRetAnterior = false;
                                                                                    var esAnualizada = false;
                                                                                    retencion_ganancias[i].imp_retenido_anterior = 0.0;
                                                                                    retencion_ganancias[i].base_calculo_retencion = parseFloat(1.5, 10);
                                                                                    retencion_ganancias[i].base_calculo_retencion_impresion = parseFloat(1.5, 10);
                                                                                    log.debug("L54 - Calculo Retenciones", "LINE 1198 - CALCULARETENCIONES - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                                    log.debug("L54 - Calculo Retenciones", "LINE 1199 - CALCULARETENCIONES - retencion_ganancias[i].base_calculo_retencion_impresion: " + retencion_ganancias[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());
                                                                                    retencion_ganancias[i].importe_retencion = parseFloat(1.5, 10);
                                                                                    log.debug("L54 - Calculo Retenciones", "LINE 1201 - CALCULARETENCIONES - Retención manual - retencion_ganancias[i].importe_retencion: " + retencion_ganancias[i].importe_retencion + " ** TIEMPO" + new Date());

                                                                                    // Nuevo - Alicuota Retencion
                                                                                    retencion_ganancias[i].alicuota = parseFloat(1.00, 10);
                                                                                    log.debug("L54 - Calculo Retenciones", "LINE 1205 - CALCULARETENCIONES - retencion_ganancias[i].alicuota: " + retencion_ganancias[i].alicuota + " ** TIEMPO" + new Date());
                                                                                    log.debug("L54 - Calculo Retenciones", "LINE 1206 - CALCULARETENCIONES - retencion_ganancias[i].importe_retencion: " + retencion_ganancias[i].importe_retencion + " ** TIEMPO" + new Date());
                                                                                    var objRetencionGAN = {};
                                                                                    objRetencionGAN.warning = false;

                                                                                } else {
                                                                                    var esAnualizada = false;
                                                                                    // Se extrae el monto retenido anterior para el periodo que se realiza la Vendor payment
                                                                                    retencion_ganancias[i].imp_retenido_anterior = 0.0;

                                                                                    var objImporteRetenidoAnterior = arrayImpRetenidosAnteriores.filter(function (obj) {
                                                                                        return (obj.codigoRetencion == retencion_ganancias[i].codigo);
                                                                                    });

                                                                                    if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                        retencion_ganancias[i].imp_retenido_anterior = parseFloat(objImporteRetenidoAnterior[0].imp_retenido, 10);
                                                                                    }

                                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - Retenciones Gan - retencion_ganancias[i].imp_retenido_anterior: " + retencion_ganancias[i].imp_retenido_anterior + " ** TIEMPO" + new Date());

                                                                                    //FDS2 var _pagosPasadosGAN = getImpPagosPasados(entity, id_posting_period, "gan", retencion_ganancias[i].codigo, moneda, subsidiariaPago);
                                                                                    // NUEVO PARA NO CONSIDERAR PAGOS ANTERIORES EN FACTURAS MAX_VALUE
                                                                                    //var _pagosPasadosGAN = getImpFacturasPagas(entity, trandate, subsidiariaPago, retencion_ganancias[i].codigo, "gan");
                                                                                    //_pagosPasadosGAN = JSON.parse(_pagosPasadosGAN);
                                                                                    var impBrutoPagosPasadosTotales = 0.0;
                                                                                    var impPagosPasadosTotal = 0.0;

                                                                                    var objPagosPasadosCodRet = resultPagosPasadosCodRet.filter(function (obj) {
                                                                                        return (obj.codigoRetGanancias == retencion_ganancias[i].codigo);
                                                                                    });

                                                                                    if (!isEmpty(objPagosPasadosCodRet) && objPagosPasadosCodRet.length > 0) {
                                                                                        // Se determina el total de importes brutos pagados anteriormente para cada factura, y así calcular bien su importe neto a pagar total
                                                                                        if (!isEmpty(resultsPagPasFact) && resultsPagPasFact.length > 0) {

                                                                                            for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                                // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                                if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                                    var impBrutoFactPagosPasados = parseFloat(obtener_imp_factura_pasado_pagada(resultsPagPasFact, objPagosPasadosCodRet[j].idInterno), 10);
                                                                                                    var impBrutoTotalFactPagar = parseFloat(impBrutoFactPagosPasados, 10) + parseFloat(objPagosPasadosCodRet[j].importe, 10); // sumo el importe que ya ha sido pagado anteriormente con el que se quiere pagar ahora
                                                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1060 - objPagosPasadosCodRet[j].idInterno: " + objPagosPasadosCodRet[j].idInterno + " - impBrutoFactPagosPasados: " + impBrutoFactPagosPasados + " - objPagosPasadosCodRet[j].importe: " + objPagosPasadosCodRet[j].importe + " - impBrutoTotalFactPagar: " + impBrutoTotalFactPagar + " - objPagosPasadosCodRet[j]: " + JSON.stringify(objPagosPasadosCodRet[j]) + " - ** TIEMPO" + new Date());

                                                                                                    // Se verifica si la suma de importes brutos de pagos pasados excede el importe bruto de la factura a pagar, esto se hace para no tomar en cuenta el monto en la base de calculo y asignarle 0
                                                                                                    if (parseFloat(Math.abs(impBrutoFactPagosPasados), 10) >= parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                        impBrutoPagosPasadosTotales = 0.0;
                                                                                                    } else {
                                                                                                        // Se verifica si la suma de los importes brutos pagados anteriormente + el nuevo importe bruto de la factura a pagar sobrepasa el importe bruto total de la factura a pagar
                                                                                                        // Si lo sobrepasa, entonces al importe de la factura a pagar le asigno lo que resta de pago permitido para esa factura, este caso es para cuando existen líneas de iva no gravado y no las toma en cuenta
                                                                                                        // De esta manera no se excede el pago de una factura de su importe bruto permitido
                                                                                                        if (parseFloat(Math.abs(impBrutoTotalFactPagar), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                            impBrutoPagosPasadosTotales = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) - parseFloat(impBrutoFactPagosPasados, 10), 10);
                                                                                                        } else {
                                                                                                            impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                                        }
                                                                                                    }
                                                                                                    var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                                    impPagosPasadosTotal += parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1077 - impPagosPasadosTotal: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                                }
                                                                                            }
                                                                                        } else {
                                                                                            for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                                // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                                if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                                    if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importe), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                        impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importeBruto, 10);
                                                                                                    } else {
                                                                                                        impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                                    }

                                                                                                    var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                                    impPagosPasadosTotal += parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1089 - impPagosPasadosTotal: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    }

                                                                                    // Se extrae el total de las bases de cálculo de las retenciones para el codigo de retención enviado por parámetro en el periodo fiscal
                                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - getImpFacturasPagas - objPagosPasadosCodRet: " + JSON.stringify(objPagosPasadosCodRet) + " ** TIEMPO" + new Date());

                                                                                    var resultMinNoImponible = paramRetenciones.filter(function (obj) {
                                                                                        return (obj.codigo == retencion_ganancias[i].codigo && obj.tipoContGAN.split(",").includes(tipoContGAN) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                                    });

                                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - resultMinNoImponible: " + JSON.stringify(resultMinNoImponible) + " ** TIEMPO" + new Date());

                                                                                    if (!isEmpty(resultMinNoImponible) && resultMinNoImponible.length > 0) {
                                                                                        var minimoNoImponible = resultMinNoImponible[0].minNoImponible;
                                                                                    } else {
                                                                                        var minimoNoImponible = 0;
                                                                                    }

                                                                                    // Se extrae el total de las bases de cálculo de las retenciones para el codigo de retención enviado por parámetro en el periodo fiscal
                                                                                    var baseCalcPagosRetenidosGAN = 0.0;

                                                                                    var objImporteRetenidoAnterior = arrayBaseCalcPagosRetenidos.filter(function (obj) {
                                                                                        return (obj.codigoRetencion == retencion_ganancias[i].codigo);
                                                                                    });

                                                                                    if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                        baseCalcPagosRetenidosGAN = parseFloat(objImporteRetenidoAnterior[0].importe, 10);
                                                                                    }

                                                                                    log.debug("L54 - Calculo Retenciones", "LINE 1303 - CALCULARETENCIONES - LINE 1134 - baseCalcPagosRetenidosGAN: " + baseCalcPagosRetenidosGAN + " - es anualizada: " + esAnualizada + " ** TIEMPO" + new Date());
                                                                                    impPagosPasadosTotal = parseFloat(numberTruncTwoDec(impPagosPasadosTotal), 10);
                                                                                    baseCalcPagosRetenidosGAN = parseFloat(numberTruncTwoDec(baseCalcPagosRetenidosGAN), 10);

                                                                                    /** Modificacición Ganacia Exterior */
                                                                                    if(resultMinNoImponible[0].esGananciaExterior){
                                                                                        retencion_ganancias[i].base_calculo_retencion = parseFloat(retencion_ganancias[i].importe_factura_pagar, 10) - parseFloat(minimoNoImponible, 10);
                                                                                        considerarImportesRetAnterior = false;
                                                                                    }else{
                                                                                        retencion_ganancias[i].base_calculo_retencion = parseFloat(retencion_ganancias[i].importe_factura_pagar, 10) + parseFloat(impPagosPasadosTotal, 10) - parseFloat(minimoNoImponible, 10);
                                                                                    }
                                                                                    log.debug("L54 - Calculo Retenciones", "LINE 1308 - CALCULARETENCIONES - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                                    log.debug("L54 - Calculo Retenciones", "LINE 1309 - CALCULARETENCIONES - Pagos Pasados: " + JSON.stringify(objPagosPasadosCodRet) + " - Importe Factura: " + retencion_ganancias[i].importe_factura_pagar + " - Tipo Cambio: " + tasa_cambio_pago + " Importe Retenido Anterior : " + retencion_ganancias[i].imp_retenido_anterior + " - impPagosPasadosTotal: " + impPagosPasadosTotal + " - ** TIEMPO" + new Date());

                                                                                    var diferenciaBaseCalculoPagado = Math.abs(impPagosPasadosTotal - (baseCalcPagosRetenidosGAN + parseFloat(minimoNoImponible, 10)));
                                                                                    // var existeDiferenciaBaseCalculo = true;

                                                                                    /* if ((parseFloat(diferenciaBaseCalculoPagado, 10) == 0.00) || ((parseFloat(diferenciaBaseCalculoPagado, 10) >= 0.00) && (parseFloat(diferenciaBaseCalculoPagado, 10) <= 0.05))) { // marguen de diferencia
                                                                                        // Base calculo en moneda de transaccion, sin redondear
                                                                                        // retencion_ganancias[i].base_calculo_retencion = parseFloat(parseFloat(retencion_ganancias[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosGAN, 10), 10);
                                                                                        retencion_ganancias[i].base_calculo_retencion = parseFloat(retencion_ganancias[i].importe_factura_pagar, 10);
                                                                                        // Base calculo impresión en moneda de transaccion, sin redondear
                                                                                        retencion_ganancias[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosGAN, 10) + parseFloat(retencion_ganancias[i].base_calculo_retencion, 10), 10);
                                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1137 - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " - retencion_ganancias[i].base_calculo_retencion_impresion: " + retencion_ganancias[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());
                                                                                        baseCalcPagosRetenidosGAN = 0.0;
                                                                                        retencion_ganancias[i].imp_retenido_anterior = 0.00;
                                                                                        existeDiferenciaBaseCalculo = false;
                                                                                    } */

                                                                                    // log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                                    // log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - Pagos Pasados: " + JSON.stringify(objPagosPasadosCodRet) + " - Importe Factura: " + retencion_ganancias[i].importe_factura_pagar + " - Tipo Cambio: " + tasa_cambio_pago + " Importe Retenido Anterior : " + retencion_ganancias[i].imp_retenido_anterior + " - impPagosPasadosTotal: " + impPagosPasadosTotal + " - ** TIEMPO" + new Date());

                                                                                    // var objRetencionGAN = getRetencion(entity, "gan", retencion_ganancias[i].codigo, retencion_ganancias[i].base_calculo_retencion, id_posting_period, retencion_ganancias[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_ganancias[i].nombreRetencion, baseCalcPagosRetenidosGAN);
                                                                                    var objRetencionGAN = getRetencion(entity, "gan", retencion_ganancias[i].codigo, retencion_ganancias[i].base_calculo_retencion, id_posting_period, retencion_ganancias[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_ganancias[i].nombreRetencion, 0);
                                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - objRetencionGAN: " + JSON.stringify(objRetencionGAN) + " ** TIEMPO" + new Date());
                                                                                    retencion_ganancias[i].importe_retencion = objRetencionGAN.importeRetencion;
                                                                                    retencion_ganancias[i].importe_retencion = parseFloat(retencion_ganancias[i].importe_retencion, 10); // En Moneda Base

                                                                                    // Base calculo en moneda de transaccion, sin redondear
                                                                                    // retencion_ganancias[i].base_calculo_retencion = parseFloat(parseFloat(retencion_ganancias[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosGAN, 10), 10);

                                                                                    // Base calculo impresión en moneda de transaccion, sin redondear
                                                                                    // if (existeDiferenciaBaseCalculo) {
                                                                                    // retencion_ganancias[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosGAN, 10) + parseFloat(retencion_ganancias[i].base_calculo_retencion, 10), 10);
                                                                                    retencion_ganancias[i].base_calculo_retencion_impresion = parseFloat(retencion_ganancias[i].base_calculo_retencion, 10);
                                                                                    // }
                                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1137 - retencion_ganancias[i].base_calculo_retencion: " + retencion_ganancias[i].base_calculo_retencion + " - retencion_ganancias[i].base_calculo_retencion_impresion: " + retencion_ganancias[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());

                                                                                    // Nuevo - Alicuota Retencion
                                                                                    retencion_ganancias[i].alicuota = parseFloat(objRetencionGAN.alicuotaRetencion, 10); // Alicuota sin redondear
                                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_ganancias[i].alicuota: " + retencion_ganancias[i].alicuota + " ** TIEMPO" + new Date());
                                                                                }
                                                                            }

                                                                            if (objRetencionGAN.warning) {
                                                                                respuestaRetenciones.warning = true;
                                                                                respuestaRetenciones.mensajeWarning.push(objRetencionGAN.mensaje);
                                                                            }
                                                                        }
                                                                    }

                                                                }

                                                                if (errorConfCodRetMGanancias == true) {
                                                                    respuestaRetenciones.warning = true;
                                                                    respuestaRetenciones.mensajeWarning.push("No se calculará la Retencion de Ganancias de Factura M debido a que no se encuentra configurada la Retencion");
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - No se calculará la Retencion de Ganancias de Factura M debido a que no se encuentra configurada la Retencion" + " ** TIEMPO" + new Date());
                                                                    respuestaRetenciones.importeRetencion = 0;
                                                                    respuestaRetenciones.alicuotaRetencion = 0;
                                                                }
                                                            }
                                                        }//FIN if (esAgenteRetencionGan)

                                                        log.audit("Governance Monitoring", "LINE 1162 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_ganancias: " + JSON.stringify(retencion_ganancias) + " ** TIEMPO" + new Date());

                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - esAgenteRetencionSUSS: " + esAgenteRetencionSUSS + ", estaInscriptoRegimenSUSS: " + estaInscriptoRegimenSUSS + ", retencion_suss: " + JSON.stringify(retencion_suss) + ", retencion_suss.length: " + retencion_suss.length + " ** TIEMPO" + new Date());

                                                        log.audit("Governance Monitoring", "LINE 1169 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        if (esAgenteRetencionSUSS) {

                                                            if (estaInscriptoRegimenSUSS) {

                                                                // JSALAZAR: 09/12/19 - INICIO - MANEJO DE IMPORTES Y MEJORAS PERFOMANCE RET. SUSS
                                                                if (!isEmpty(retencion_suss) && retencion_suss.length > 0) {

                                                                    var arrayIdFacturasPagadasMonotributos = [];
                                                                    var arrayIdFacturasPagadas = [];
                                                                    var impBrutoPagosPasadosTotales = 0.0;
                                                                    var impPagosPasadosTotal = 0.0;
                                                                    var arrayCodRetSUSS = [];
                                                                    var arrayCodRetSUSSMonotributos = [];
                                                                    var esAnualizada = false;

                                                                    // INICIO - Extraccion de código de retenciones de SUSS
                                                                    for (var i = 0; i < retencion_suss.length; i++) {

                                                                        var resultSUSSMonotributo = paramRetenciones.filter(function (obj) {
                                                                            return (obj.codigo == retencion_suss[i].codigo  && obj.tipoContSUSS.split(",").includes(tipoContSUSS) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                        });

                                                                        var baseCalculoAnualizada = false;
                                                                        if (!isEmpty(resultSUSSMonotributo) && resultSUSSMonotributo.length > 0) {
                                                                            baseCalculoAnualizada = resultSUSSMonotributo[0].baseCalculoAnualizada;
                                                                        }

                                                                        if (baseCalculoAnualizada) {
                                                                            arrayCodRetSUSSMonotributos.push(retencion_suss[i].codigo);
                                                                        } else {
                                                                            arrayCodRetSUSS.push(retencion_suss[i].codigo);
                                                                        }
                                                                    }
                                                                    // FIN - Extraccion de código de retenciones de SUSS

                                                                    // Se obtiene el detalle de las facturas pagas en el periodo de la VP que se está ejecutando (sirve para las que son mensuales)
                                                                    var resultPagosPasadosCodRet = getImpFacturasPagas(entity, trandate, subsidiariaPago, arrayCodRetSUSS, "suss", esAnualizada, id_posting_period);
                                                                    resultPagosPasadosCodRet = JSON.parse(resultPagosPasadosCodRet);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1221 - Despues de llamar a getImpFacturasPagas - resultPagosPasadosCodRet: " + JSON.stringify(resultPagosPasadosCodRet) + " ** TIEMPO" + new Date());

                                                                    // Se verifica que existan pagos realizados anteriormente para ese periodo
                                                                    if (!isEmpty(resultPagosPasadosCodRet) && resultPagosPasadosCodRet.length > 0) {
                                                                        for (var j = 0; j < resultPagosPasadosCodRet.length; j++) {
                                                                            arrayIdFacturasPagadas.push(resultPagosPasadosCodRet[j].idInterno);
                                                                        }

                                                                        // Se obtienen los pagos anteriores al periodo fiscal indicado en la vendor payment, para saber que porcentaje de las facturas a pagar ha sido pagado anteriormente
                                                                        var resultsPagPasFact = calcularImportesBrutosPagosPasados(entity, arrayIdFacturasPagadas, subsidiariaPago, trandate, esAnualizada);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1231 - Despues de llamar a calcularImportesBrutosPagosPasados - resultsPagPasFact: " + JSON.stringify(resultsPagPasFact) + " ** TIEMPO" + new Date());

                                                                        // Se obtienen los importes netos de las facturas a pagar
                                                                        var arrayFacturasImpNetoPagar = obtener_arreglo_netos_vendorbill_moneda_local(entity, arrayIdFacturasPagadas, subsidiariaPago, false, esONG);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1235 - Despues de llamar a obtener_arreglo_netos_vendorbill_moneda_local - arrayFacturasImpNetoPagar: " + JSON.stringify(arrayFacturasImpNetoPagar) + " ** TIEMPO" + new Date());

                                                                        // Se obtienen los importes brutos de las facturas a pagar
                                                                        var arrayFacturaImpBrutoPagar = obtener_arreglo_codigos_ret_vendorbill_moneda_local(entity, arrayIdFacturasPagadas, subsidiariaPago, esONG);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1239 - Despues de llamar a obtener_arreglo_codigos_ret_vendorbill_moneda_local - arrayFacturaImpBrutoPagar: " + JSON.stringify(arrayFacturaImpBrutoPagar) + " ** TIEMPO" + new Date());

                                                                        for (var j = 0; j < resultPagosPasadosCodRet.length; j++) {
                                                                            resultPagosPasadosCodRet[j].importeNeto = 0.0;
                                                                            for (var k = 0; k < arrayFacturasImpNetoPagar.length; k++) {
                                                                                if (arrayFacturasImpNetoPagar[k].idInterno == resultPagosPasadosCodRet[j].idInterno) {
                                                                                    resultPagosPasadosCodRet[j].importeNeto = arrayFacturasImpNetoPagar[k].importe;
                                                                                }
                                                                            }
                                                                        }

                                                                        for (var j = 0; j < resultPagosPasadosCodRet.length; j++) {
                                                                            resultPagosPasadosCodRet[j].importeBruto = 0.0;
                                                                            for (var k = 0; k < arrayFacturaImpBrutoPagar.length; k++) {
                                                                                if (arrayFacturaImpBrutoPagar[k].idInterno == resultPagosPasadosCodRet[j].idInterno) {
                                                                                    resultPagosPasadosCodRet[j].importeBruto = arrayFacturaImpBrutoPagar[k].importeTotal;
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1260 - resultPagosPasadosCodRet: " + JSON.stringify(resultPagosPasadosCodRet) + " ** TIEMPO" + new Date());

                                                                    // Se obtiene el detalle de las facturas pagas en el periodo de la VP que se está ejecutando (sirve para las que son anualizadas)
                                                                    esAnualizada = true;
                                                                    var resultPagosPasadosCodRetMonotributos = getImpFacturasPagas(entity, trandate, subsidiariaPago, arrayCodRetSUSSMonotributos, "suss", esAnualizada, id_posting_period);
                                                                    resultPagosPasadosCodRetMonotributos = JSON.parse(resultPagosPasadosCodRetMonotributos);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1266 - Despues de llamar a getImpFacturasPagas - resultPagosPasadosCodRetMonotributos: " + JSON.stringify(resultPagosPasadosCodRetMonotributos) + " ** TIEMPO" + new Date());

                                                                    // Se verifica que existan pagos realizados anteriormente para ese periodo
                                                                    if (!isEmpty(resultPagosPasadosCodRetMonotributos) && resultPagosPasadosCodRetMonotributos.length > 0) {
                                                                        for (var j = 0; j < resultPagosPasadosCodRetMonotributos.length; j++) {
                                                                            arrayIdFacturasPagadasMonotributos.push(resultPagosPasadosCodRetMonotributos[j].idInterno);
                                                                        }

                                                                        // Se obtienen los pagos anteriores al periodo fiscal indicado en la vendor payment, para saber que porcentaje de las facturas a pagar ha sido pagado anteriormente
                                                                        var resultsPagPasFactMonotributos = calcularImportesBrutosPagosPasados(entity, arrayIdFacturasPagadasMonotributos, subsidiariaPago, trandate, esAnualizada);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1276 - Despues de llamar a calcularImportesBrutosPagosPasados - resultsPagPasFactMonotributos: " + JSON.stringify(resultsPagPasFactMonotributos) + " ** TIEMPO" + new Date());

                                                                        // Se obtienen los importes netos de las facturas a pagar
                                                                        var arrayFacturasImpNetoPagar = obtener_arreglo_netos_vendorbill_moneda_local(entity, arrayIdFacturasPagadasMonotributos, subsidiariaPago, false, esONG);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1280 - Despues de llamar a obtener_arreglo_netos_vendorbill_moneda_local - arrayFacturasImpNetoPagar: " + JSON.stringify(arrayFacturasImpNetoPagar) + " ** TIEMPO" + new Date());

                                                                        // Se obtienen los importes brutos de las facturas a pagar
                                                                        var arrayFacturaImpBrutoPagar = obtener_arreglo_codigos_ret_vendorbill_moneda_local(entity, arrayIdFacturasPagadasMonotributos, subsidiariaPago, esONG);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1284 - Despues de llamar a obtener_arreglo_codigos_ret_vendorbill_moneda_local - arrayFacturaImpBrutoPagar: " + JSON.stringify(arrayFacturaImpBrutoPagar) + " ** TIEMPO" + new Date());

                                                                        for (var j = 0; j < resultPagosPasadosCodRetMonotributos.length; j++) {
                                                                            resultPagosPasadosCodRetMonotributos[j].importeNeto = 0.0;
                                                                            for (var k = 0; k < arrayFacturasImpNetoPagar.length; k++) {
                                                                                if (arrayFacturasImpNetoPagar[k].idInterno == resultPagosPasadosCodRetMonotributos[j].idInterno) {
                                                                                    resultPagosPasadosCodRetMonotributos[j].importeNeto = arrayFacturasImpNetoPagar[k].importe;
                                                                                }
                                                                            }
                                                                        }

                                                                        for (var j = 0; j < resultPagosPasadosCodRetMonotributos.length; j++) {
                                                                            resultPagosPasadosCodRetMonotributos[j].importeBruto = 0.0;
                                                                            for (var k = 0; k < arrayFacturaImpBrutoPagar.length; k++) {
                                                                                if (arrayFacturaImpBrutoPagar[k].idInterno == resultPagosPasadosCodRetMonotributos[j].idInterno) {
                                                                                    resultPagosPasadosCodRetMonotributos[j].importeBruto = arrayFacturaImpBrutoPagar[k].importeTotal;
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1305 - resultPagosPasadosCodRetMonotributos: " + JSON.stringify(resultPagosPasadosCodRetMonotributos) + " ** TIEMPO" + new Date());

                                                                    // INICIO -- Obtencion de Importes Retenidos por Periodo y por Codigos de Retención a procesar (sirve para las que son mensuales)
                                                                    esAnualizada = false;
                                                                    var arrayImpRetenidosAnteriores = getImpRetenido(entity, id_posting_period, arrayCodRetSUSS, moneda, subsidiariaPago, esAnualizada, trandate);
                                                                    arrayImpRetenidosAnteriores = JSON.parse(arrayImpRetenidosAnteriores);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1311 - Despues de llamar a getImpRetenido - arrayImpRetenidosAnteriores: " + JSON.stringify(arrayImpRetenidosAnteriores) + " ** TIEMPO" + new Date());
                                                                    // FIN -- Obtencion de Importes Retenidos por Periodo y por Codigos de Retención a procesar (sirve para las que son mensuales)

                                                                    // Se obtienen las bases de cálculo de las retenciones calculadas, acumuladas y agrupadas por código de retención (sirve para las que son mensuales)
                                                                    var arrayBaseCalcPagosRetenidos = getImpPagosPasadosCodRetencion(entity, id_posting_period, subsidiariaPago, arrayCodRetSUSS, "SUSS", esAnualizada, trandate);
                                                                    arrayBaseCalcPagosRetenidos = JSON.parse(arrayBaseCalcPagosRetenidos);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1317 - Despues de llamar a getImpPagosPasadosCodRetencion - arrayBaseCalcPagosRetenidos: " + JSON.stringify(arrayBaseCalcPagosRetenidos) + " ** TIEMPO" + new Date());

                                                                    // INICIO -- Obtencion de Importes Retenidos por Periodo y por Codigos de Retención a procesar (sirve para las que son anualizadas)
                                                                    esAnualizada = true;
                                                                    var arrayImpRetenidosAnterioresAnuales = getImpRetenido(entity, id_posting_period, arrayCodRetSUSSMonotributos, moneda, subsidiariaPago, esAnualizada, trandate);
                                                                    arrayImpRetenidosAnterioresAnuales = JSON.parse(arrayImpRetenidosAnterioresAnuales);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1323 - Despues de llamar a getImpRetenido - arrayImpRetenidosAnterioresAnuales: " + JSON.stringify(arrayImpRetenidosAnterioresAnuales) + " ** TIEMPO" + new Date());
                                                                    // FIN -- Obtencion de Importes Retenidos por Periodo y por Codigos de Retención a procesar (sirve para las que son anualizadas)

                                                                    // Se obtienen las bases de cálculo de las retenciones calculadas, acumuladas y agrupadas por código de retención (sirve para las que son anualizadas)
                                                                    var arrayBaseCalcPagosRetenidosMonotributos = getImpPagosPasadosCodRetencion(entity, id_posting_period, subsidiariaPago, arrayCodRetSUSSMonotributos, "SUSS", esAnualizada, trandate);
                                                                    arrayBaseCalcPagosRetenidosMonotributos = JSON.parse(arrayBaseCalcPagosRetenidosMonotributos);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1329 - Despues de llamar a getImpPagosPasadosCodRetencion - arrayBaseCalcPagosRetenidosMonotributos: " + JSON.stringify(arrayBaseCalcPagosRetenidosMonotributos) + " ** TIEMPO" + new Date());
                                                                }
                                                                // JSALAZAR: 09/12/19 - FIN - MANEJO DE IMPORTES Y MEJORAS PERFOMANCE RET. SUSS

                                                                for (var i = 0; i < retencion_suss.length; i++) {

                                                                    if (!isEmpty(retencion_suss[i].codigo)) {

                                                                        var considerarImportesRetAnterior = true;

                                                                        var resultCodigoRetencionSUSS = paramRetenciones.filter(function (obj) {
                                                                            return (obj.codigo == retencion_suss[i].codigo  && obj.tipoContSUSS.split(",").includes(tipoContSUSS) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                        });

                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - resultCodigoRetencionSUSS: " + JSON.stringify(resultCodigoRetencionSUSS) + " ** TIEMPO" + new Date());

                                                                        var baseCalculoAnualizada = false;
                                                                        if (!isEmpty(resultCodigoRetencionSUSS) && resultCodigoRetencionSUSS.length > 0) {
                                                                            baseCalculoAnualizada = resultCodigoRetencionSUSS[0].baseCalculoAnualizada;
                                                                        }

                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - baseCalculoAnualizada: " + JSON.stringify(baseCalculoAnualizada) + " ** TIEMPO" + new Date());

                                                                        if (baseCalculoAnualizada) {

                                                                            var esAnualizada = true;
                                                                            retencion_suss[i].imp_retenido_anterior = 0.0;
                                                                            //retencion_suss[i].imp_retenido_anterior = getImpRetenido(entity, id_posting_period, retencion_suss[i].codigo, moneda, subsidiariaPago, esAnualizada, trandate);

                                                                            var objImporteRetenidoAnterior = arrayImpRetenidosAnterioresAnuales.filter(function (obj) {
                                                                                return (obj.codigoRetencion == retencion_suss[i].codigo);
                                                                            });

                                                                            if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                retencion_suss[i].imp_retenido_anterior = parseFloat(objImporteRetenidoAnterior[0].imp_retenido, 10);
                                                                            }

                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - Retenciones SUSS Monotributo - retencion_suss[i].imp_retenido_anterior: " + retencion_suss[i].imp_retenido_anterior + " ** TIEMPO" + new Date());

                                                                            var impBrutoPagosPasadosTotales = 0.0;
                                                                            var impPagosPasadosTotal = 0.0;

                                                                            var objPagosPasadosCodRet = resultPagosPasadosCodRetMonotributos.filter(function (obj) {
                                                                                return (obj.codigoRetSUSS == retencion_suss[i].codigo);
                                                                            });

                                                                            if (!isEmpty(objPagosPasadosCodRet) && objPagosPasadosCodRet.length > 0) {
                                                                                // Se determina el total de importes brutos pagados anteriormente para cada factura, y así calcular bien su importe neto a pagar total
                                                                                if (!isEmpty(resultsPagPasFactMonotributos) && resultsPagPasFactMonotributos.length > 0) {

                                                                                    for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                        // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                        if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                            var impBrutoFactPagosPasados = parseFloat(obtener_imp_factura_pasado_pagada(resultsPagPasFactMonotributos, objPagosPasadosCodRet[j].idInterno), 10);
                                                                                            var impBrutoTotalFactPagar = parseFloat(impBrutoFactPagosPasados, 10) + parseFloat(objPagosPasadosCodRet[j].importe, 10); // sumo el importe que ya ha sido pagado anteriormente con el que se quiere pagar ahora
                                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1382 - objPagosPasadosCodRet[j].idInterno: " + objPagosPasadosCodRet[j].idInterno + " - impBrutoFactPagosPasados: " + impBrutoFactPagosPasados + " - objPagosPasadosCodRet[j].importe: " + objPagosPasadosCodRet[j].importe + " - impBrutoTotalFactPagar: " + impBrutoTotalFactPagar + " - objPagosPasadosCodRet[j]: " + JSON.stringify(objPagosPasadosCodRet[j]) + " - ** TIEMPO" + new Date());

                                                                                            // Se verifica si la suma de importes brutos de pagos pasados excede el importe bruto de la factura a pagar, esto se hace para no tomar en cuenta el monto en la base de calculo y asignarle 0
                                                                                            if (parseFloat(Math.abs(impBrutoFactPagosPasados), 10) >= parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                impBrutoPagosPasadosTotales = 0.0;
                                                                                            } else {
                                                                                                // Se verifica si la suma de los importes brutos pagados anteriormente + el nuevo importe bruto de la factura a pagar sobrepasa el importe bruto total de la factura a pagar
                                                                                                // Si lo sobrepasa, entonces al importe de la factura a pagar le asigno lo que resta de pago permitido para esa factura, este caso es para cuando existen líneas de iva no gravado y no las toma en cuenta
                                                                                                // De esta manera no se excede el pago de una factura de su importe bruto permitido
                                                                                                if (parseFloat(Math.abs(impBrutoTotalFactPagar), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                    impBrutoPagosPasadosTotales = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) - parseFloat(impBrutoFactPagosPasados, 10), 10);
                                                                                                } else {
                                                                                                    impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                                }
                                                                                            }
                                                                                            var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                            impPagosPasadosTotal += parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1399 - impPagosPasadosTotal: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                        }
                                                                                    }
                                                                                } else {
                                                                                    for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                        // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                        if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                            if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importe), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importeBruto, 10);
                                                                                            } else {
                                                                                                impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                            }

                                                                                            var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                            impPagosPasadosTotal += parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1411 - impPagosPasadosTotal: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }

                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1416 - Retenciones SUSS Monotributo - getImpFacturasPagas - objPagosPasadosCodRet: " + JSON.stringify(objPagosPasadosCodRet) + " ** TIEMPO" + new Date());

                                                                            // Se extrae el total de las bases de cálculo de las retenciones para el codigo de retención enviado por parámetro en el periodo de un año
                                                                            var resultMinNoImponible = paramRetenciones.filter(function (obj) {
                                                                                return (obj.codigo == retencion_suss[i].codigo  && obj.tipoContSUSS.split(",").includes(tipoContSUSS) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                            });

                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1423 - resultMinNoImponible: " + JSON.stringify(resultMinNoImponible));

                                                                            if (!isEmpty(resultMinNoImponible) && resultMinNoImponible.length > 0) {
                                                                                var minimoNoImponible = resultMinNoImponible[0].minNoImponible;
                                                                            } else {
                                                                                var minimoNoImponible = 0;
                                                                            }

                                                                            // Se extrae el total de las bases de cálculo de las retenciones para el codigo de retención enviado por parámetro en el periodo fiscal
                                                                            var baseCalcPagosRetenidosSUSS = 0.0;

                                                                            var objImporteRetenidoAnterior = arrayBaseCalcPagosRetenidosMonotributos.filter(function (obj) {
                                                                                return (obj.codigoRetencion == retencion_suss[i].codigo);
                                                                            });

                                                                            if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                baseCalcPagosRetenidosSUSS = parseFloat(objImporteRetenidoAnterior[0].importe, 10);
                                                                            }

                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1015 - baseCalcPagosRetenidosSUSS: " + baseCalcPagosRetenidosSUSS + " - es anualizada: " + esAnualizada + " ** TIEMPO" + new Date());
                                                                            impPagosPasadosTotal = parseFloat(numberTruncTwoDec(impPagosPasadosTotal), 10);
                                                                            baseCalcPagosRetenidosSUSS = parseFloat(numberTruncTwoDec(baseCalcPagosRetenidosSUSS), 10);

                                                                            retencion_suss[i].base_calculo_retencion = parseFloat(retencion_suss[i].importe_factura_pagar, 10) + parseFloat(impPagosPasadosTotal, 10) - parseFloat(minimoNoImponible, 10);
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss[i].base_calculo_retencion: " + retencion_suss[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - Pagos Pasados: " + JSON.stringify(objPagosPasadosCodRet) + " - Importe Factura: " + retencion_suss[i].importe_factura_pagar + " - Tipo Cambio: " + tasa_cambio_pago + " Importe Retenido Anterior : " + retencion_suss[i].imp_retenido_anterior + " - impPagosPasadosTotal: " + impPagosPasadosTotal + " - ** TIEMPO" + new Date());

                                                                            var diferenciaBaseCalculoPagado = Math.abs(impPagosPasadosTotal - (baseCalcPagosRetenidosSUSS + parseFloat(minimoNoImponible, 10)));
                                                                            // var existeDiferenciaBaseCalculo = true;

                                                                            /* if ((parseFloat(diferenciaBaseCalculoPagado, 10) == 0.00) || ((parseFloat(diferenciaBaseCalculoPagado, 10) >= 0.00) && (parseFloat(diferenciaBaseCalculoPagado, 10) <= 0.05))) { // marguen de diferencia
                                                                                // retencion_suss[i].base_calculo_retencion = parseFloat(parseFloat(retencion_suss[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosSUSS, 10), 10);
                                                                                retencion_suss[i].base_calculo_retencion = parseFloat(retencion_suss[i].importe_factura_pagar, 10);
                                                                                retencion_suss[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosSUSS, 10) + parseFloat(retencion_suss[i].base_calculo_retencion, 10), 10);
                                                                                baseCalcPagosRetenidosSUSS = 0.0;
                                                                                retencion_suss[i].imp_retenido_anterior = 0.00;
                                                                                existeDiferenciaBaseCalculo = false;
                                                                            } */

                                                                            // log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss[i].base_calculo_retencion: " + retencion_suss[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                            // log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - Pagos Pasados: " + JSON.stringify(objPagosPasadosCodRet) + " - Importe Factura: " + retencion_suss[i].importe_factura_pagar + " - Tipo Cambio: " + tasa_cambio_pago + " Importe Retenido Anterior : " + retencion_suss[i].imp_retenido_anterior + " - impPagosPasadosTotal: " + impPagosPasadosTotal + " - ** TIEMPO" + new Date());

                                                                            // var objRetencionSUSS = getRetencion(entity, "suss", retencion_suss[i].codigo, retencion_suss[i].base_calculo_retencion, id_posting_period, retencion_suss[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_suss[i].nombreRetencion, baseCalcPagosRetenidosSUSS);
                                                                            var objRetencionSUSS = getRetencion(entity, "suss", retencion_suss[i].codigo, retencion_suss[i].base_calculo_retencion, id_posting_period, retencion_suss[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_suss[i].nombreRetencion, 0);
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - objRetencionSUSS: " + JSON.stringify(objRetencionSUSS) + " ** TIEMPO" + new Date());
                                                                            retencion_suss[i].importe_retencion = objRetencionSUSS.importeRetencion;
                                                                            retencion_suss[i].importe_retencion = parseFloat(retencion_suss[i].importe_retencion, 10); // En Moneda Base

                                                                            // retencion_suss[i].base_calculo_retencion = parseFloat(parseFloat(retencion_suss[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosSUSS, 10), 10);

                                                                            // if (existeDiferenciaBaseCalculo) {
                                                                            // retencion_suss[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosSUSS, 10) + parseFloat(retencion_suss[i].base_calculo_retencion, 10), 10);
                                                                            retencion_suss[i].base_calculo_retencion_impresion = parseFloat(retencion_suss[i].base_calculo_retencion, 10);
                                                                            // }
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1018 - retencion_suss[i].base_calculo_retencion: " + retencion_suss[i].base_calculo_retencion + " - retencion_suss[i].base_calculo_retencion_impresion: " + retencion_suss[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());

                                                                            // Nuevo - Alicuota Retencion
                                                                            retencion_suss[i].alicuota = parseFloat(objRetencionSUSS.alicuotaRetencion, 10);
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss[i].alicuota: " + retencion_suss[i].alicuota + " ** TIEMPO" + new Date());


                                                                        } else {

                                                                            if (retencion_suss[i].esRetManual) {

                                                                                var considerarImportesRetAnterior = false;
                                                                                var esAnualizada = false;
                                                                                retencion_suss[i].imp_retenido_anterior = 0.0;
                                                                                retencion_suss[i].base_calculo_retencion = parseFloat(1.5, 10);
                                                                                retencion_suss[i].base_calculo_retencion_impresion = parseFloat(1.5, 10);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss[i].base_calculo_retencion: " + retencion_suss[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss[i].base_calculo_retencion_impresion: " + retencion_suss[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());
                                                                                retencion_suss[i].importe_retencion = parseFloat(1.5, 10);

                                                                                // Nuevo - Alicuota Retencion
                                                                                retencion_suss[i].alicuota = parseFloat(1.00, 10);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss[i].alicuota: " + retencion_suss[i].alicuota + " ** TIEMPO" + new Date());
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss[i].importe_retencion: " + retencion_suss[i].importe_retencion + " ** TIEMPO" + new Date());
                                                                                var objRetencionSUSS = {};
                                                                                objRetencionSUSS.warning = false;

                                                                            } else {

                                                                                var esAnualizada = false;
                                                                                // Se extrae el monto retenido anterior para el periodo que se realiza la Vendor payment
                                                                                retencion_suss[i].imp_retenido_anterior = 0.0;

                                                                                var objImporteRetenidoAnterior = arrayImpRetenidosAnteriores.filter(function (obj) {
                                                                                    return (obj.codigoRetencion == retencion_suss[i].codigo);
                                                                                });

                                                                                if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                    retencion_suss[i].imp_retenido_anterior = parseFloat(objImporteRetenidoAnterior[0].imp_retenido, 10);
                                                                                }

                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - Retenciones SUSS - retencion_suss[i].imp_retenido_anterior: " + retencion_suss[i].imp_retenido_anterior + " ** TIEMPO" + new Date());

                                                                                var impBrutoPagosPasadosTotales = 0.0;
                                                                                var impPagosPasadosTotal = 0.0;

                                                                                var objPagosPasadosCodRet = resultPagosPasadosCodRet.filter(function (obj) {
                                                                                    return (obj.codigoRetSUSS == retencion_suss[i].codigo);
                                                                                });

                                                                                if (!isEmpty(objPagosPasadosCodRet) && objPagosPasadosCodRet.length > 0) {
                                                                                    // Se determina el total de importes brutos pagados anteriormente para cada factura, y así calcular bien su importe neto a pagar total
                                                                                    if (!isEmpty(resultsPagPasFact) && resultsPagPasFact.length > 0) {

                                                                                        for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                            // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                            if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                                var impBrutoFactPagosPasados = parseFloat(obtener_imp_factura_pasado_pagada(resultsPagPasFact, objPagosPasadosCodRet[j].idInterno), 10);
                                                                                                var impBrutoTotalFactPagar = parseFloat(impBrutoFactPagosPasados, 10) + parseFloat(objPagosPasadosCodRet[j].importe, 10); // sumo el importe que ya ha sido pagado anteriormente con el que se quiere pagar ahora
                                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1493 - objPagosPasadosCodRet[j].idInterno: " + objPagosPasadosCodRet[j].idInterno + " - impBrutoFactPagosPasados: " + impBrutoFactPagosPasados + " - objPagosPasadosCodRet[j].importe: " + objPagosPasadosCodRet[j].importe + " - impBrutoTotalFactPagar: " + impBrutoTotalFactPagar + " - objPagosPasadosCodRet[j]: " + JSON.stringify(objPagosPasadosCodRet[j]) + " - ** TIEMPO" + new Date());

                                                                                                // Se verifica si la suma de importes brutos de pagos pasados excede el importe bruto de la factura a pagar, esto se hace para no tomar en cuenta el monto en la base de calculo y asignarle 0
                                                                                                if (parseFloat(Math.abs(impBrutoFactPagosPasados), 10) >= parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                    impBrutoPagosPasadosTotales = 0.0;
                                                                                                } else {
                                                                                                    // Se verifica si la suma de los importes brutos pagados anteriormente + el nuevo importe bruto de la factura a pagar sobrepasa el importe bruto total de la factura a pagar
                                                                                                    // Si lo sobrepasa, entonces al importe de la factura a pagar le asigno lo que resta de pago permitido para esa factura, este caso es para cuando existen líneas de iva no gravado y no las toma en cuenta
                                                                                                    // De esta manera no se excede el pago de una factura de su importe bruto permitido
                                                                                                    if (parseFloat(Math.abs(impBrutoTotalFactPagar), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                        impBrutoPagosPasadosTotales = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) - parseFloat(impBrutoFactPagosPasados, 10), 10);
                                                                                                    } else {
                                                                                                        impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                                    }
                                                                                                }
                                                                                                var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                                impPagosPasadosTotal += parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1510 - impPagosPasadosTotal: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                            }
                                                                                        }
                                                                                    } else {
                                                                                        for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                            // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                            if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                                if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importe), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                    impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importeBruto, 10);
                                                                                                } else {
                                                                                                    impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                                }

                                                                                                var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                                impPagosPasadosTotal += parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1522 - impPagosPasadosTotal: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }

                                                                                // Se extrae el total de las bases de cálculo de las retenciones para el codigo de retención enviado por parámetro en el periodo fiscal
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - getImpFacturasPagas - objPagosPasadosCodRet: " + JSON.stringify(objPagosPasadosCodRet) + " ** TIEMPO" + new Date());

                                                                                var resultMinNoImponible = paramRetenciones.filter(function (obj) {
                                                                                    return (obj.codigo == retencion_suss[i].codigo && obj.tipoContSUSS.split(",").includes(tipoContSUSS) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                                });

                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - resultMinNoImponible: " + JSON.stringify(resultMinNoImponible) + " ** TIEMPO" + new Date());

                                                                                if (!isEmpty(resultMinNoImponible) && resultMinNoImponible.length > 0) {
                                                                                    var minimoNoImponible = resultMinNoImponible[0].minNoImponible;
                                                                                } else {
                                                                                    var minimoNoImponible = 0;
                                                                                }

                                                                                // Se extrae el total de las bases de cálculo de las retenciones para el codigo de retención enviado por parámetro en el periodo fiscal
                                                                                var baseCalcPagosRetenidosSUSS = 0.0;

                                                                                var objImporteRetenidoAnterior = arrayBaseCalcPagosRetenidos.filter(function (obj) {
                                                                                    return (obj.codigoRetencion == retencion_suss[i].codigo);
                                                                                });

                                                                                if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                    baseCalcPagosRetenidosSUSS = parseFloat(objImporteRetenidoAnterior[0].importe, 10);
                                                                                }

                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1565 - baseCalcPagosRetenidosSUSS: " + baseCalcPagosRetenidosSUSS + " - es anualizada: " + esAnualizada + " ** TIEMPO" + new Date());
                                                                                impPagosPasadosTotal = parseFloat(numberTruncTwoDec(impPagosPasadosTotal), 10);
                                                                                baseCalcPagosRetenidosSUSS = parseFloat(numberTruncTwoDec(baseCalcPagosRetenidosSUSS), 10);

                                                                                retencion_suss[i].base_calculo_retencion = parseFloat(retencion_suss[i].importe_factura_pagar, 10) + parseFloat(impPagosPasadosTotal, 10) - parseFloat(minimoNoImponible, 10);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss[i].base_calculo_retencion: " + retencion_suss[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - Pagos Pasados: " + JSON.stringify(objPagosPasadosCodRet) + " - Importe Factura: " + retencion_suss[i].importe_factura_pagar + " - Tipo Cambio: " + tasa_cambio_pago + " Importe Retenido Anterior : " + retencion_suss[i].imp_retenido_anterior + " - impPagosPasadosTotal: " + impPagosPasadosTotal + " - ** TIEMPO" + new Date());

                                                                                var diferenciaBaseCalculoPagado = Math.abs(impPagosPasadosTotal - (baseCalcPagosRetenidosSUSS + parseFloat(minimoNoImponible, 10)));
                                                                                // var existeDiferenciaBaseCalculo = true;

                                                                                /* if ((parseFloat(diferenciaBaseCalculoPagado, 10) == 0.00) || ((parseFloat(diferenciaBaseCalculoPagado, 10) >= 0.00) && (parseFloat(diferenciaBaseCalculoPagado, 10) <= 0.05))) { // marguen de diferencia
                                                                                    // retencion_suss[i].base_calculo_retencion = parseFloat(parseFloat(retencion_suss[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosSUSS, 10), 10);
                                                                                    retencion_suss[i].base_calculo_retencion = parseFloat(retencion_suss[i].importe_factura_pagar, 10);
                                                                                    retencion_suss[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosSUSS, 10) + parseFloat(retencion_suss[i].base_calculo_retencion, 10), 10);
                                                                                    baseCalcPagosRetenidosSUSS = 0.0;
                                                                                    retencion_suss[i].imp_retenido_anterior = 0.00;
                                                                                    existeDiferenciaBaseCalculo = false;
                                                                                } */

                                                                                // log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss[i].base_calculo_retencion: " + retencion_suss[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                                // log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - Pagos Pasados: " + JSON.stringify(objPagosPasadosCodRet) + " - Importe Factura: " + retencion_suss[i].importe_factura_pagar + " - Tipo Cambio: " + tasa_cambio_pago + " Importe Retenido Anterior : " + retencion_suss[i].imp_retenido_anterior + " - impPagosPasadosTotal: " + impPagosPasadosTotal + " - ** TIEMPO" + new Date());

                                                                                // var objRetencionSUSS = getRetencion(entity, "suss", retencion_suss[i].codigo, retencion_suss[i].base_calculo_retencion, id_posting_period, retencion_suss[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_suss[i].nombreRetencion, baseCalcPagosRetenidosSUSS);
                                                                                var objRetencionSUSS = getRetencion(entity, "suss", retencion_suss[i].codigo, retencion_suss[i].base_calculo_retencion, id_posting_period, retencion_suss[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_suss[i].nombreRetencion, 0);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - objRetencionSUSS: " + JSON.stringify(objRetencionSUSS) + " ** TIEMPO" + new Date());
                                                                                retencion_suss[i].importe_retencion = objRetencionSUSS.importeRetencion;
                                                                                retencion_suss[i].importe_retencion = parseFloat(retencion_suss[i].importe_retencion, 10); // En Moneda Base

                                                                                // retencion_suss[i].base_calculo_retencion = parseFloat(parseFloat(retencion_suss[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosSUSS, 10), 10);

                                                                                // if (existeDiferenciaBaseCalculo) {
                                                                                // retencion_suss[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosSUSS, 10) + parseFloat(retencion_suss[i].base_calculo_retencion, 10), 10);
                                                                                retencion_suss[i].base_calculo_retencion_impresion = parseFloat(retencion_suss[i].base_calculo_retencion, 10);
                                                                                // }
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1568 - retencion_suss[i].base_calculo_retencion: " + retencion_suss[i].base_calculo_retencion + " - retencion_suss[i].base_calculo_retencion_impresion: " + retencion_suss[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());

                                                                                // Nuevo - Alicuota Retencion
                                                                                retencion_suss[i].alicuota = parseFloat(objRetencionSUSS.alicuotaRetencion, 10);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss[i].alicuota: " + retencion_suss[i].alicuota + " ** TIEMPO" + new Date());
                                                                            }
                                                                        }

                                                                        if (objRetencionSUSS.warning) {
                                                                            respuestaRetenciones.warning = true;
                                                                            respuestaRetenciones.mensajeWarning.push(objRetencionSUSS.mensaje);
                                                                        }
                                                                    }

                                                                }
                                                            }
                                                        }//FIN if (esAgenteRetencionSUSS)

                                                        log.audit("Governance Monitoring", "LINE 1585 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss: " + JSON.stringify(retencion_suss) + " ** TIEMPO" + new Date());

                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - esAgenteRetencionIVA: " + esAgenteRetencionIVA + ", estaInscriptoRegimenIVA: " + estaInscriptoRegimenIVA + ", retencion_iva: " + JSON.stringify(retencion_iva) + ", retencion_iva.length: " + retencion_iva.length + " ** TIEMPO" + new Date());

                                                        log.audit("Governance Monitoring", "LINE 1591 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        if (esAgenteRetencionIVA) {

                                                            if (estaInscriptoRegimenIVA) {

                                                                // JSALAZAR: 09/12/19 - INICIO - MANEJO DE IMPORTES Y MEJORAS PERFOMANCE RET. IVA
                                                                if (!isEmpty(retencion_iva) && retencion_iva.length > 0) {

                                                                    var arrayIdFacturasPagadas = [];
                                                                    var impBrutoPagosPasadosTotales = 0.0;
                                                                    var impPagosPasadosTotal = 0.0;
                                                                    var arrayCodRetIVA = [];
                                                                    var esAnualizada = false;

                                                                    // INICIO - Extraccion de código de retenciones de IVA
                                                                    for (var i = 0; i < retencion_iva.length; i++) {
                                                                        if (!isEmpty(retencion_iva[i].codigo) && (!retencion_iva[i].calcularSobreIVA)) {
                                                                            arrayCodRetIVA.push(retencion_iva[i].codigo);
                                                                        }
                                                                    }
                                                                    // FIN - Extraccion de código de retenciones de IVA

                                                                    // Se obtiene el detalle de las facturas pagas en el periodo de la VP que se está ejecutando (sirve para las que son mensuales)
                                                                    var resultPagosPasadosCodRet = getImpFacturasPagas(entity, trandate, subsidiariaPago, arrayCodRetIVA, "iva", esAnualizada, id_posting_period);
                                                                    resultPagosPasadosCodRet = JSON.parse(resultPagosPasadosCodRet);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1620 - Despues de llamar a getImpFacturasPagas - resultPagosPasadosCodRet: " + JSON.stringify(resultPagosPasadosCodRet) + " ** TIEMPO" + new Date());

                                                                    // Se verifica que existan pagos realizados anteriormente para ese periodo
                                                                    if (!isEmpty(resultPagosPasadosCodRet) && resultPagosPasadosCodRet.length > 0) {
                                                                        for (var j = 0; j < resultPagosPasadosCodRet.length; j++) {
                                                                            arrayIdFacturasPagadas.push(resultPagosPasadosCodRet[j].idInterno);
                                                                        }

                                                                        // Se obtienen los pagos anteriores al periodo fiscal indicado en la vendor payment, para saber que porcentaje de las facturas a pagar ha sido pagado anteriormente
                                                                        var resultsPagPasFact = calcularImportesBrutosPagosPasados(entity, arrayIdFacturasPagadas, subsidiariaPago, trandate, esAnualizada);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1630 - Despues de llamar a calcularImportesBrutosPagosPasados - resultsPagPasFact: " + JSON.stringify(resultsPagPasFact) + " ** TIEMPO" + new Date());

                                                                        // Se obtienen los importes netos de las facturas a pagar
                                                                        var arrayFacturasImpNetoPagar = obtener_arreglo_netos_vendorbill_moneda_local(entity, arrayIdFacturasPagadas, subsidiariaPago, false, esONG);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1634 - Despues de llamar a obtener_arreglo_netos_vendorbill_moneda_local - arrayFacturasImpNetoPagar: " + JSON.stringify(arrayFacturasImpNetoPagar) + " ** TIEMPO" + new Date());

                                                                        // Se obtienen los importes brutos de las facturas a pagar
                                                                        var arrayFacturaImpBrutoPagar = obtener_arreglo_codigos_ret_vendorbill_moneda_local(entity, arrayIdFacturasPagadas, subsidiariaPago, esONG);
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1638 - Despues de llamar a obtener_arreglo_codigos_ret_vendorbill_moneda_local - arrayFacturaImpBrutoPagar: " + JSON.stringify(arrayFacturaImpBrutoPagar) + " ** TIEMPO" + new Date());

                                                                        for (var j = 0; j < resultPagosPasadosCodRet.length; j++) {
                                                                            resultPagosPasadosCodRet[j].importeNeto = 0.0;
                                                                            for (var k = 0; k < arrayFacturasImpNetoPagar.length; k++) {
                                                                                if (arrayFacturasImpNetoPagar[k].idInterno == resultPagosPasadosCodRet[j].idInterno) {
                                                                                    resultPagosPasadosCodRet[j].importeNeto = arrayFacturasImpNetoPagar[k].importe;
                                                                                }
                                                                            }
                                                                        }

                                                                        for (var j = 0; j < resultPagosPasadosCodRet.length; j++) {
                                                                            resultPagosPasadosCodRet[j].importeBruto = 0.0;
                                                                            for (var k = 0; k < arrayFacturaImpBrutoPagar.length; k++) {
                                                                                if (arrayFacturaImpBrutoPagar[k].idInterno == resultPagosPasadosCodRet[j].idInterno) {
                                                                                    resultPagosPasadosCodRet[j].importeBruto = arrayFacturaImpBrutoPagar[k].importeTotal;
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1659 - resultPagosPasadosCodRet: " + JSON.stringify(resultPagosPasadosCodRet) + " ** TIEMPO" + new Date());

                                                                    // INICIO -- Obtencion de Importes Retenidos por Periodo y por Codigos de Retención a procesar (sirve para las que son mensuales)
                                                                    esAnualizada = false;
                                                                    var arrayImpRetenidosAnteriores = getImpRetenido(entity, id_posting_period, arrayCodRetIVA, moneda, subsidiariaPago, esAnualizada, trandate);
                                                                    arrayImpRetenidosAnteriores = JSON.parse(arrayImpRetenidosAnteriores);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1665 - Despues de llamar a getImpRetenido - arrayImpRetenidosAnteriores: " + JSON.stringify(arrayImpRetenidosAnteriores) + " ** TIEMPO" + new Date());
                                                                    // FIN -- Obtencion de Importes Retenidos por Periodo y por Codigos de Retención a procesar (sirve para las que son mensuales)

                                                                    // Se obtienen las bases de cálculo de las retenciones calculadas, acumuladas y agrupadas por código de retención (sirve para las que son mensuales)
                                                                    var arrayBaseCalcPagosRetenidos = getImpPagosPasadosCodRetencion(entity, id_posting_period, subsidiariaPago, arrayCodRetIVA, "IVA", esAnualizada, trandate);
                                                                    arrayBaseCalcPagosRetenidos = JSON.parse(arrayBaseCalcPagosRetenidos);
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1671 - Despues de llamar a getImpPagosPasadosCodRetencion - arrayBaseCalcPagosRetenidos: " + JSON.stringify(arrayBaseCalcPagosRetenidos) + " ** TIEMPO" + new Date());
                                                                }
                                                                // JSALAZAR: 09/12/19 - FIN - MANEJO DE IMPORTES Y MEJORAS PERFOMANCE RET. IVA

                                                                for (var i = 0; i < retencion_iva.length; i++) {

                                                                    var considerarImportesRetAnterior = true;

                                                                    // NUEVO Si es Factura M , buscar el codigo de Retencion de Factura M
                                                                    // Se modifica para que realice la Retencion como Factura M solo si el Importe Neto es >1000
                                                                    //if(!isEmpty(retencion_iva[i].esFacturaM) && retencion_iva[i].esFacturaM==true && parseFloat(retencion_iva[i].importe_factura_pagar,10)>=1000){
                                                                    //if(!isEmpty(retencion_iva[i].esFacturaM) && retencion_iva[i].esFacturaM==true && parseFloat(retencion_iva[i].imp_neto_factura,10)>=1000){
                                                                    if (!isEmpty(retencion_iva[i].esFacturaM) && retencion_iva[i].esFacturaM == true) {
                                                                        // Busco el Codigo de Retencion de IVA de Factura M
                                                                        //var codigoRetencionM=buscarCodigoRetencionM(2,subsidiariaPago); // 2 - IVA
                                                                        //if(!isEmpty(codigoRetencionMIVA) && codigoRetencionMIVA.length>0){

                                                                        if (!isEmpty(retencion_iva[i].codigo)) {
                                                                            //retencion_iva[i].codigo=codigoRetencionMIVA[0].codigo;

                                                                            // Se extrae el monto retenido anterior para el periodo que se realiza la Vendor payment
                                                                            var esAnualizada = false;
                                                                            retencion_iva[i].imp_retenido_anterior = 0;

                                                                            var objImporteRetenidoAnterior = arrayImpRetenidosAnteriores.filter(function (obj) {
                                                                                return (obj.codigoRetencion == retencion_iva[i].codigo);
                                                                            });

                                                                            if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                retencion_iva[i].imp_retenido_anterior = parseFloat(objImporteRetenidoAnterior[0].imp_retenido, 10);
                                                                            }

                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - Retenciones IVA M - retencion_iva[i].imp_retenido_anterior: " + retencion_iva[i].imp_retenido_anterior + " ** TIEMPO" + new Date());

                                                                            var impBrutoPagosPasadosTotales = 0.0;
                                                                            var impPagosPasadosTotal = 0.0;
                                                                            var impPagosPasadosTotalAux = 0.0;
                                                                            var impPagosPasadosTotalIVA = 0.0;

                                                                            var objPagosPasadosCodRet = resultPagosPasadosCodRet.filter(function (obj) {
                                                                                return (obj.codigoRetIVA == retencion_iva[i].codigo);
                                                                            });

                                                                            if (!isEmpty(objPagosPasadosCodRet) && objPagosPasadosCodRet.length > 0) {
                                                                                // Se determina el total de importes brutos pagados anteriormente para cada factura, y así calcular bien su importe neto a pagar total
                                                                                if (!isEmpty(resultsPagPasFact) && resultsPagPasFact.length > 0) {

                                                                                    for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                        // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                        if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                            var impBrutoFactPagosPasados = parseFloat(obtener_imp_factura_pasado_pagada(resultsPagPasFact, objPagosPasadosCodRet[j].idInterno), 10);
                                                                                            var impBrutoTotalFactPagar = parseFloat(impBrutoFactPagosPasados, 10) + parseFloat(objPagosPasadosCodRet[j].importe, 10); // sumo el importe que ya ha sido pagado anteriormente con el que se quiere pagar ahora
                                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1718 - Retenciones IVA M - objPagosPasadosCodRet[j].idInterno: " + objPagosPasadosCodRet[j].idInterno + " - impBrutoFactPagosPasados: " + impBrutoFactPagosPasados + " - objPagosPasadosCodRet[j].importe: " + objPagosPasadosCodRet[j].importe + " - impBrutoTotalFactPagar: " + impBrutoTotalFactPagar + " - objPagosPasadosCodRet[j]: " + JSON.stringify(objPagosPasadosCodRet[j]) + " - ** TIEMPO" + new Date());

                                                                                            // Se verifica si la suma de importes brutos de pagos pasados excede el importe bruto de la factura a pagar, esto se hace para no tomar en cuenta el monto en la base de calculo y asignarle 0
                                                                                            if (parseFloat(Math.abs(impBrutoFactPagosPasados), 10) >= parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                impBrutoPagosPasadosTotales = 0.0;
                                                                                            } else {
                                                                                                // Se verifica si la suma de los importes brutos pagados anteriormente + el nuevo importe bruto de la factura a pagar sobrepasa el importe bruto total de la factura a pagar
                                                                                                // Si lo sobrepasa, entonces al importe de la factura a pagar le asigno lo que resta de pago permitido para esa factura, este caso es para cuando existen líneas de iva no gravado y no las toma en cuenta
                                                                                                // De esta manera no se excede el pago de una factura de su importe bruto permitido
                                                                                                if (parseFloat(Math.abs(impBrutoTotalFactPagar), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                    impBrutoPagosPasadosTotales = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) - parseFloat(impBrutoFactPagosPasados, 10), 10);
                                                                                                } else {
                                                                                                    impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                                }
                                                                                            }
                                                                                            var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                            impPagosPasadosTotalAux = parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                            impPagosPasadosTotalIVA = parseFloat(impBrutoPagosPasadosTotales - impPagosPasadosTotalAux, 10);
                                                                                            impPagosPasadosTotal += impPagosPasadosTotalIVA;
                                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1735 - Retenciones IVA M - impPagosPasadosTotalIVA: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                        }
                                                                                    }
                                                                                } else {
                                                                                    for (var j = 0; j < objPagosPasadosCodRet.length; j++) {
                                                                                        // Verifico si los importes son mayores a 0 para no caer en error de NaN por división entre 0.
                                                                                        if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10) > 0 && parseFloat(Math.abs(objPagosPasadosCodRet[j].importeNeto), 10) > 0) {
                                                                                            if (parseFloat(Math.abs(objPagosPasadosCodRet[j].importe), 10) > parseFloat(Math.abs(objPagosPasadosCodRet[j].importeBruto), 10)) {
                                                                                                impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importeBruto, 10);
                                                                                            } else {
                                                                                                impBrutoPagosPasadosTotales = parseFloat(objPagosPasadosCodRet[j].importe, 10);
                                                                                            }

                                                                                            var coeficiente = parseFloat(parseFloat(objPagosPasadosCodRet[j].importeBruto, 10) / parseFloat(objPagosPasadosCodRet[j].importeNeto, 10), 10);
                                                                                            impPagosPasadosTotalAux = parseFloat(impBrutoPagosPasadosTotales / coeficiente, 10);
                                                                                            impPagosPasadosTotalIVA = parseFloat(impBrutoPagosPasadosTotales - impPagosPasadosTotalAux, 10);
                                                                                            impPagosPasadosTotal += impPagosPasadosTotalIVA;
                                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - line 1747 - impPagosPasadosTotalIVA: " + impPagosPasadosTotal + " - coeficiente: " + coeficiente + " ** TIEMPO" + new Date());
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }

                                                                            var resultMinNoImponible = paramRetenciones.filter(function (obj) {
                                                                                return (obj.codigo == retencion_iva[i].codigo && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                            });

                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - Retenciones IVA M - resultMinNoImponible: " + JSON.stringify(resultMinNoImponible) + " ** TIEMPO" + new Date());

                                                                            if (!isEmpty(resultMinNoImponible) && resultMinNoImponible.length > 0) {
                                                                                var minimoNoImponible = resultMinNoImponible[0].minNoImponible;
                                                                            } else {
                                                                                var minimoNoImponible = 0;
                                                                            }

                                                                            // Se extrae el total de las bases de cálculo de las retenciones para el codigo de retención enviado por parámetro en el periodo fiscal
                                                                            var baseCalcPagosRetenidosIVA = 0.0;

                                                                            var objImporteRetenidoAnterior = arrayBaseCalcPagosRetenidos.filter(function (obj) {
                                                                                return (obj.codigoRetencion == retencion_iva[i].codigo);
                                                                            });

                                                                            if (!isEmpty(objImporteRetenidoAnterior) && objImporteRetenidoAnterior.length > 0) {
                                                                                baseCalcPagosRetenidosIVA = parseFloat(objImporteRetenidoAnterior[0].importe, 10);
                                                                            }

                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1789 - baseCalcPagosRetenidosIVA: " + baseCalcPagosRetenidosIVA + " - es anualizada: " + esAnualizada + " ** TIEMPO" + new Date());
                                                                            impPagosPasadosTotal = parseFloat(numberTruncTwoDec(impPagosPasadosTotal), 10);
                                                                            baseCalcPagosRetenidosIVA = parseFloat(numberTruncTwoDec(baseCalcPagosRetenidosIVA), 10);

                                                                            retencion_iva[i].base_calculo_retencion = parseFloat(retencion_iva[i].importe_factura_pagar, 10) + parseFloat(impPagosPasadosTotal, 10) - parseFloat(minimoNoImponible, 10);
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - Valores - Pagos Pasados total IVA: " + impPagosPasadosTotal + ", Importe Factura: " + retencion_iva[i].importe_factura_pagar + ", Tipo Cambio: " + tasa_cambio_pago + ", Importe Retenido Anterior : " + retencion_iva[i].imp_retenido_anterior + " ** TIEMPO" + new Date());

                                                                            var diferenciaBaseCalculoPagado = Math.abs(impPagosPasadosTotal - (baseCalcPagosRetenidosIVA + parseFloat(minimoNoImponible, 10)));
                                                                            // var existeDiferenciaBaseCalculo = true;

                                                                            /* if ((parseFloat(diferenciaBaseCalculoPagado, 10) == 0.00) || ((parseFloat(diferenciaBaseCalculoPagado, 10) >= 0.00) && (parseFloat(diferenciaBaseCalculoPagado, 10) <= 0.05))) { // marguen de diferencia
                                                                                // retencion_iva[i].base_calculo_retencion = parseFloat(parseFloat(retencion_iva[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosIVA, 10), 10);
                                                                                retencion_iva[i].base_calculo_retencion = parseFloat(retencion_iva[i].importe_factura_pagar, 10);
                                                                                retencion_iva[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosIVA, 10) + parseFloat(retencion_iva[i].base_calculo_retencion, 10), 10);
                                                                                baseCalcPagosRetenidosIVA = 0.0;
                                                                                retencion_iva[i].imp_retenido_anterior = 0.00;
                                                                                existeDiferenciaBaseCalculo = false;
                                                                            } */

                                                                            // var objRetencionIVA = getRetencion(entity, "iva", retencion_iva[i].codigo, retencion_iva[i].base_calculo_retencion, id_posting_period, retencion_iva[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_iva[i].nombreRetencion, baseCalcPagosRetenidosIVA);
                                                                            var objRetencionIVA = getRetencion(entity, "iva", retencion_iva[i].codigo, retencion_iva[i].base_calculo_retencion, id_posting_period, retencion_iva[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_iva[i].nombreRetencion, 0);
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES  - objRetencionIVA: " + JSON.stringify(objRetencionIVA) + " ** TIEMPO" + new Date());
                                                                            retencion_iva[i].importe_retencion = objRetencionIVA.importeRetencion;
                                                                            retencion_iva[i].importe_retencion = parseFloat(retencion_iva[i].importe_retencion, 10); // En Moneda Base

                                                                            // retencion_iva[i].base_calculo_retencion = parseFloat(parseFloat(retencion_iva[i].base_calculo_retencion, 10) - parseFloat(baseCalcPagosRetenidosIVA, 10), 10);

                                                                            // if (existeDiferenciaBaseCalculo) {
                                                                            // retencion_iva[i].base_calculo_retencion_impresion = parseFloat(parseFloat(baseCalcPagosRetenidosIVA, 10) + parseFloat(retencion_iva[i].base_calculo_retencion, 10), 10);
                                                                            retencion_iva[i].base_calculo_retencion_impresion = parseFloat(retencion_iva[i].base_calculo_retencion, 10);
                                                                            // }
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - LINE 1792 - retencion_iva[i].base_calculo_retencion: " + retencion_iva[i].base_calculo_retencion + " - retencion_iva[i].base_calculo_retencion_impresion: " + retencion_iva[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());

                                                                            // Nuevo - Alicuota Retencion
                                                                            retencion_iva[i].alicuota = parseFloat(objRetencionIVA.alicuotaRetencion, 10);
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].alicuota: " + retencion_iva[i].alicuota + " ** TIEMPO" + new Date());
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].importe_retencion: " + retencion_iva[i].importe_retencion + " ** TIEMPO" + new Date());

                                                                            if (objRetencionIVA.warning) {
                                                                                respuestaRetenciones.warning = true;
                                                                                respuestaRetenciones.mensajeWarning.push(objRetencionIVA.mensaje);
                                                                            }

                                                                        }
                                                                        else {
                                                                            respuestaRetenciones.warning = true;
                                                                            respuestaRetenciones.mensajeWarning.push("No se calculará la Retencion de IVA de Factura M debido a que no se encuentra configurada la Retencion");
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - No se calculará la Retencion de IVA de Factura M debido a que no se encuentra configurada la Retencion" + " ** TIEMPO" + new Date());
                                                                            respuestaRetenciones.importeRetencion = 0;
                                                                            respuestaRetenciones.alicuotaRetencion = 0;
                                                                        }
                                                                    }
                                                                    else {

                                                                        if (!isEmpty(retencion_iva[i].codigo) && !isEmpty(retencion_iva[i].calcularSobreIVA) && (retencion_iva[i].calcularSobreIVA)) {

                                                                            var considerarImportesRetAnterior = false;
                                                                            var esAnualizada = false;
                                                                            retencion_iva[i].imp_retenido_anterior = 0.0;

                                                                            var resultMinNoImponible = paramRetenciones.filter(function (obj) {
                                                                                return (obj.codigo == retencion_iva[i].codigo && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                            });

                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - resultMinNoImponible: " + JSON.stringify(resultMinNoImponible) + " ** TIEMPO" + new Date());

                                                                            if (!isEmpty(resultMinNoImponible) && resultMinNoImponible.length > 0) {
                                                                                var minimoNoImponible = resultMinNoImponible[0].minNoImponible;
                                                                            } else {
                                                                                var minimoNoImponible = 0;
                                                                            }

                                                                            retencion_iva[i].base_calculo_retencion = parseFloat(retencion_iva[i].importe_factura_pagar, 10);
                                                                            retencion_iva[i].base_calculo_retencion_impresion = parseFloat(retencion_iva[i].importe_factura_pagar, 10);

                                                                            //retencion_iva[i].base_calculo_retencion = parseFloat(retencion_iva[i].importe_factura_pagar, 10) - parseFloat(minimoNoImponible, 10);
                                                                            //retencion_iva[i].base_calculo_retencion_impresion = parseFloat(retencion_iva[i].importe_factura_pagar, 10);
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].base_calculo_retencion: " + retencion_iva[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].base_calculo_retencion_impresion: " + retencion_iva[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());

                                                                            var objRetencionIVA = getRetencion(entity, "iva", retencion_iva[i].codigo, retencion_iva[i].base_calculo_retencion, id_posting_period, retencion_iva[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_iva[i].nombreRetencion, 0);
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - objRetencionIVA: " + JSON.stringify(objRetencionIVA) + " ** TIEMPO" + new Date());
                                                                            retencion_iva[i].importe_retencion = objRetencionIVA.importeRetencion;
                                                                            retencion_iva[i].importe_retencion = parseFloat(retencion_iva[i].importe_retencion, 10); // En Moneda Base

                                                                            // Nuevo - Alicuota Retencion
                                                                            retencion_iva[i].alicuota = parseFloat(objRetencionIVA.alicuotaRetencion, 10);
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].alicuota: " + retencion_iva[i].alicuota + " ** TIEMPO" + new Date());
                                                                            log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].importe_retencion: " + retencion_iva[i].importe_retencion + " ** TIEMPO" + new Date());

                                                                            if (objRetencionIVA.warning) {
                                                                                respuestaRetenciones.warning = true;
                                                                                respuestaRetenciones.mensajeWarning.push(objRetencionIVA.mensaje);
                                                                            }
                                                                        } else {

                                                                            if (retencion_iva[i].esRetManual) {

                                                                                var considerarImportesRetAnterior = false;
                                                                                var esAnualizada = false;
                                                                                retencion_iva[i].imp_retenido_anterior = 0.0;
                                                                                retencion_iva[i].base_calculo_retencion = parseFloat(1.5, 10);
                                                                                retencion_iva[i].base_calculo_retencion_impresion = parseFloat(1.5, 10);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].base_calculo_retencion: " + retencion_iva[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].base_calculo_retencion_impresion: " + retencion_iva[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());
                                                                                retencion_iva[i].importe_retencion = parseFloat(1.5, 10);

                                                                                // Nuevo - Alicuota Retencion
                                                                                retencion_iva[i].alicuota = parseFloat(1.00, 10);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].alicuota: " + retencion_iva[i].alicuota + " ** TIEMPO" + new Date());
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].importe_retencion: " + retencion_iva[i].importe_retencion + " ** TIEMPO" + new Date());
                                                                                var objRetencionIVA = {};
                                                                                objRetencionIVA.warning = false;

                                                                                if (objRetencionIVA.warning) {
                                                                                    respuestaRetenciones.warning = true;
                                                                                    respuestaRetenciones.mensajeWarning.push(objRetencionIVA.mensaje);
                                                                                }

                                                                            } else {

                                                                                var considerarImportesRetAnterior = false;
                                                                                var esAnualizada = false;
                                                                                retencion_iva[i].imp_retenido_anterior = 0.0;

                                                                                var resultMinNoImponible = paramRetenciones.filter(function (obj) {
                                                                                    return (obj.codigo == retencion_iva[i].codigo && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                                });

                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - resultMinNoImponible: " + JSON.stringify(resultMinNoImponible) + " ** TIEMPO" + new Date());

                                                                                if (!isEmpty(resultMinNoImponible) && resultMinNoImponible.length > 0) {
                                                                                    var minimoNoImponible = resultMinNoImponible[0].minNoImponible;
                                                                                } else {
                                                                                    var minimoNoImponible = 0;
                                                                                }

                                                                                retencion_iva[i].base_calculo_retencion = parseFloat(retencion_iva[i].importe_factura_pagar, 10);
                                                                                retencion_iva[i].base_calculo_retencion_impresion = parseFloat(retencion_iva[i].importe_factura_pagar, 10);

                                                                                //retencion_iva[i].base_calculo_retencion = parseFloat(retencion_iva[i].importe_factura_pagar, 10) - parseFloat(minimoNoImponible, 10);
                                                                                //retencion_iva[i].base_calculo_retencion_impresion = parseFloat(retencion_iva[i].importe_factura_pagar, 10);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].base_calculo_retencion: " + retencion_iva[i].base_calculo_retencion + " ** TIEMPO" + new Date());
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].base_calculo_retencion_impresion: " + retencion_iva[i].base_calculo_retencion_impresion + " ** TIEMPO" + new Date());

                                                                                var objRetencionIVA = getRetencion(entity, "iva", retencion_iva[i].codigo, retencion_iva[i].base_calculo_retencion, id_posting_period, retencion_iva[i].imp_retenido_anterior, tasa_cambio_pago, null, considerarImportesRetAnterior, retencion_iva[i].nombreRetencion, 0);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - objRetencionIVA: " + JSON.stringify(objRetencionIVA) + " ** TIEMPO" + new Date());
                                                                                retencion_iva[i].importe_retencion = objRetencionIVA.importeRetencion;
                                                                                retencion_iva[i].importe_retencion = parseFloat(retencion_iva[i].importe_retencion, 10); // En Moneda Base

                                                                                // Nuevo - Alicuota Retencion
                                                                                retencion_iva[i].alicuota = parseFloat(objRetencionIVA.alicuotaRetencion, 10);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].alicuota: " + retencion_iva[i].alicuota + " ** TIEMPO" + new Date());
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva[i].importe_retencion: " + retencion_iva[i].importe_retencion + " ** TIEMPO" + new Date());

                                                                                if (objRetencionIVA.warning) {
                                                                                    respuestaRetenciones.warning = true;
                                                                                    respuestaRetenciones.mensajeWarning.push(objRetencionIVA.mensaje);
                                                                                }
                                                                            }
                                                                        }
                                                                    }

                                                                }

                                                                if (errorConfCodRetMIVA == true) {
                                                                    respuestaRetenciones.warning = true;
                                                                    respuestaRetenciones.mensajeWarning.push("No se calculará la Retencion de IVA de Factura M debido a que no se encuentra configurada la Retencion");
                                                                    log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - No se calculará la Retencion de IVA de Factura M debido a que no se encuentra configurada la Retencion" + " ** TIEMPO" + new Date());
                                                                    respuestaRetenciones.importeRetencion = 0;
                                                                    respuestaRetenciones.alicuotaRetencion = 0;
                                                                }

                                                            }
                                                        }//FIN if (esAgenteRetencionIVA)

                                                        log.audit("Governance Monitoring", "LINE 913 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_iva: " + JSON.stringify(retencion_iva) + " ** TIEMPO" + new Date());

                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - esAgenteRetencionIIBB: " + esAgenteRetencionIIBB + ", estaInscriptoRegimenIIBB: " + estaInscriptoRegimenIIBB + ", codigosRetencionIIBB.infoRet: " + JSON.stringify(codigosRetencionIIBB.infoRet) + ", codigosRetencionIIBB.infoRet.length: " + codigosRetencionIIBB.infoRet.length + " ** TIEMPO" + new Date());

                                                        log.audit("Governance Monitoring", "LINE 919 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        var importeTotalBrutoAcum = 0.00;
                                                        var importeTotalNetoAcum = 0.00;
                                                        var existenRetParaTodasJurisd = false;

                                                        if (esAgenteRetencionIIBB) {

                                                            if (estaInscriptoRegimenIIBB) {

                                                                var mensajesErrores = "";

                                                                // Se obtienen todas las jurisdicciones del proveedor y el detalle de las mismas
                                                                var detalleJurisdicciones = obtenerJurisAcumuladas(codigosRetencionIIBB.infoRet);
                                                                var jurisdAcumuladas = detalleJurisdicciones.jurisdAcumuladas;

                                                                if (!isEmpty(jurisdAcumuladas) && jurisdAcumuladas.length > 0 && (detalleJurisdicciones.existeRetSobreBruto || detalleJurisdicciones.existeRetSobreNeto)) {

                                                                    // Se obtienen las retenciones del mes filtrando por todas las jurisdicciones que son acumuladas
                                                                    var resultRetenJurisdMens = obtenerRetenJurisdMens(entity, id_posting_period, subsidiariaPago, jurisdAcumuladas);
                                                                    existenRetParaTodasJurisd = resultRetenJurisdMens.existenRetParaTodasJurisd;

                                                                    if (!isEmpty(resultRetenJurisdMens) && !resultRetenJurisdMens.error && !existenRetParaTodasJurisd) {

                                                                        // Se obtienen todas las facturas pagadas en el mes
                                                                        var facturasPagPerIIBB = obtenerFactPagasPeriodoIIBB(entity, id_posting_period, subsidiariaPago);

                                                                        if (!isEmpty(facturasPagPerIIBB) && !facturasPagPerIIBB.error) {

                                                                            importeTotalBrutoAcum = parseFloat(facturasPagPerIIBB.importeTotalBrutoAcum, 10);
                                                                            importeTotalNetoAcum = parseFloat(facturasPagPerIIBB.importeTotalNetoAcum, 10);

                                                                        } else {
                                                                            log.error("calculoRetenciones", facturasPagPerIIBB.mensaje);
                                                                        }
                                                                    }
                                                                }

                                                                log.debug(proceso, "line 2360 - importeTotalBrutoAcum: " + importeTotalBrutoAcum + " / importeTotalNetoAcum: " + importeTotalNetoAcum + " / existenRetParaTodasJurisd: " + existenRetParaTodasJurisd);
                                                                log.audit("Governance Monitoring", "LINE 2357 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                                for (var i = 0; codigosRetencionIIBB != null && codigosRetencionIIBB.infoRet != null && i < codigosRetencionIIBB.infoRet.length; i++) {

                                                                    if (!isEmpty(codigosRetencionIIBB.infoRet[i].codigo)) {

                                                                        var superaMinBaseCalc = true;

                                                                        // Nuevo segmento para validar si el importe acumulado de la jurisdiccion supera el importe minimo de retencion
                                                                        if (!isEmpty(codigosRetencionIIBB.infoRet[i].baseCalcAcumulada) && codigosRetencionIIBB.infoRet[i].baseCalcAcumulada && !isEmpty(jurisdAcumuladas)
                                                                            && jurisdAcumuladas.length > 0 && !existenRetParaTodasJurisd) {

                                                                            // Se verifica si existe un acumulado por jurisdiccion, esto quiere decir que ya se supero el acumulado del mes y no es necesario calcular por el acumulado
                                                                            var validarRetPasadas = validarRetJurisdiccion(resultRetenJurisdMens.registros, codigosRetencionIIBB.infoRet[i].jurisdiccion);

                                                                            // Si no hay retenciones o registros de transacciones donde existan retenciones asociada a la jurisdiccion actual se procede a validar importe mensual acumulado
                                                                            if (!validarRetPasadas.existenRetenciones) {

                                                                                // Se obtiene el acumulado de acuerdo a si la jurisdiccion es sobre el monto bruto
                                                                                log.debug(proceso, "Ingreso a validacion de importes acumulados porque no existen retenciones anteriores / jurisdiccion: " + codigosRetencionIIBB.infoRet[i].jurisdiccionTexto);

                                                                                // Se configura como importe total de base de cálculo al importe acumulado del mes + el imp actual del comprobante
                                                                                codigosRetencionIIBB.infoRet[i].importe_factura_pagar += codigosRetencionIIBB.infoRet[i].calcularSobreBruto ? importeTotalBrutoAcum : importeTotalNetoAcum;
                                                                            }
                                                                        }


                                                                        log.audit("Inicio porcentaje especial", "LINE 2390 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                                                                        log.audit("valores iniciales ---- porcentaje especial", "LINE 2391 - porcentaje = " + codigosRetencionIIBB.infoRet[i].porcentajeEspecialUtilizarBI + " --- criterio: " + codigosRetencionIIBB.infoRet[i].criterioPorcentajeEspecial);
                                                                        if (!isEmpty(codigosRetencionIIBB.infoRet[i].porcentajeEspecialUtilizarBI)) {

                                                                            if (codigosRetencionIIBB.infoRet[i].porcentajeEspecialUtilizarBI.search("%") != -1)
                                                                                var porcentajeEspecialUtilizarBI = codigosRetencionIIBB.infoRet[i].porcentajeEspecialUtilizarBI.substring(0, codigosRetencionIIBB.infoRet[i].porcentajeEspecialUtilizarBI.length - 1);
                                                                            else
                                                                                var porcentajeEspecialUtilizarBI = (parseFloat(codigosRetencionIIBB.infoRet[i].porcentajeEspecialUtilizarBI, 10) * 100);

                                                                            porcentajeEspecialUtilizarBI = porcentajeEspecialUtilizarBI / 100;

                                                                            if (parseFloat(countDecimales(parseFloat(porcentajeEspecialUtilizarBI, 10)), 10) > 10)
                                                                                porcentajeEspecialUtilizarBI = parseFloat(parseFloat(porcentajeEspecialUtilizarBI, 10).toFixedOK(2), 10);

                                                                        }
                                                                        if (!isEmpty(codigosRetencionIIBB.infoRet[i].criterioPorcentajeEspecial) && codigosRetencionIIBB.infoRet[i].criterioPorcentajeEspecial == "1") {

                                                                            codigosRetencionIIBB.infoRet[i].importe_factura_pagar = codigosRetencionIIBB.infoRet[i].importe_factura_pagar * porcentajeEspecialUtilizarBI;

                                                                            if (parseFloat(countDecimales(parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10)), 10) > 10)
                                                                                codigosRetencionIIBB.infoRet[i].importe_factura_pagar = parseFloat(parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10).toFixedOK(2), 10);
                                                                        }


                                                                        superaMinBaseCalc = isEmpty(codigosRetencionIIBB.infoRet[i].impMinBaseCalculoRet) || codigosRetencionIIBB.infoRet[i].impMinBaseCalculoRet == 0 || parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10) > parseFloat(codigosRetencionIIBB.infoRet[i].impMinBaseCalculoRet, 10) ? true : false;

                                                                        if (!isEmpty(codigosRetencionIIBB.infoRet[i].criterioPorcentajeEspecial) && codigosRetencionIIBB.infoRet[i].criterioPorcentajeEspecial == "2") {

                                                                            codigosRetencionIIBB.infoRet[i].importe_factura_pagar = codigosRetencionIIBB.infoRet[i].importe_factura_pagar * porcentajeEspecialUtilizarBI;

                                                                            if (parseFloat(countDecimales(parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10)), 10) > 10)
                                                                                codigosRetencionIIBB.infoRet[i].importe_factura_pagar = parseFloat(parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10).toFixedOK(2), 10);
                                                                        }
                                                                        log.audit("valoresfinales ---- porcentaje especial", "LINE 2423 - porcentaje = " + codigosRetencionIIBB.infoRet[i].porcentajeEspecialUtilizarBI + " --- criterio: " + codigosRetencionIIBB.infoRet[i].criterioPorcentajeEspecial);
                                                                        log.audit("Fin porcentaje especial", "LINE 2424 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                                        if (superaMinBaseCalc) {

                                                                            var porcentajeImpuesto = 0;
                                                                            var mensajeConfigTucumanErronea = "";
                                                                            var ignorarRetencionTucuman = false;
                                                                            var porcentajeAlicuotaEspecialCero = false;

                                                                            if (codigosRetencionIIBB.infoRet[i].porcentajeRetencion.search("%") != -1) {
                                                                                porcentajeImpuesto = codigosRetencionIIBB.infoRet[i].porcentajeRetencion.substring(0, codigosRetencionIIBB.infoRet[i].porcentajeRetencion.length - 1);
                                                                            } else {
                                                                                // porcentajeImpuesto = parseFloat((parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoRet[i].porcentajeRetencion, 10)), 10) * (100/parseFloat(Math.pow(10, countDecimales(parseFloat(codigosRetencionIIBB.infoRet[i].porcentajeRetencion, 10))), 10))), 10);
                                                                                var cantidadDecimalesPorcentajeRetencion = parseFloat(countDecimales(parseFloat(codigosRetencionIIBB.infoRet[i].porcentajeRetencion, 10)), 10);
                                                                                if (cantidadDecimalesPorcentajeRetencion > 2) {
                                                                                    var cantidadUnidadesCero = cantidadDecimalesPorcentajeRetencion - 2; // El -2 es por el 100, que tiene dos unidades de 0
                                                                                    porcentajeImpuesto = parseFloat((parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoRet[i].porcentajeRetencion, 10)), 10) / parseFloat(Math.pow(10, cantidadUnidadesCero))), 10);
                                                                                } else {
                                                                                    porcentajeImpuesto = parseFloat((parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoRet[i].porcentajeRetencion, 10)), 10) * (100 / parseFloat(Math.pow(10, cantidadDecimalesPorcentajeRetencion), 10))), 10);
                                                                                }
                                                                            }

                                                                            var porcentajeFinal = Math.abs(parseFloat(porcentajeImpuesto, 10));
                                                                            codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(porcentajeFinal, 10);
                                                                            log.debug("L54 - Calculo Retenciones", "LINE 2258 - codigosRetencionIIBB.infoRe[i]t: " + JSON.stringify(codigosRetencionIIBB.infoRet[i]) + " - porcentajeFinal: " + porcentajeFinal);

                                                                            // INICIO - Si la retención a procesar es la de Tucuman.
                                                                            if (!isEmpty(codigosRetencionIIBB.infoRet[i].jurisdiccion) && ((codigosRetencionIIBB.infoRet[i].jurisdiccion == 24) || (codigosRetencionIIBB.infoRet[i].jurisdiccionCodigo == 924) || (codigosRetencionIIBB.infoRet[i].jurisdiccionTexto.search("924") != -1))) {
                                                                                // Si la configuración tomada proviene de Padrón o de IIBB Config General
                                                                                if (!isEmpty(codigosRetencionIIBB.infoRet[i].esPadron) && codigosRetencionIIBB.infoRet[i].esPadron) {
                                                                                    // Si el tipo de contribuyente IIBB o estado de inscripción del padrón es Convenio Local o Local
                                                                                    if (!isEmpty(codigosRetencionIIBB.infoRet[i].estadoInscripcionPadron) && !isEmpty(codigosRetencionIIBB.infoRet[i].idConvenioLocal) && codigosRetencionIIBB.infoRet[i].estadoInscripcionPadron == codigosRetencionIIBB.infoRet[i].idConvenioLocal) {
                                                                                        // Si la Condición fiscal == Responsable Inscripto && Jurisdiccion Retencion calculada == Lugar Entrega && Lugar Entrega = Tucuman (924)
                                                                                    if (!isEmpty(tipoContribuyenteIVA) && !isEmpty(codigosRetencionIIBB.infoRet[i].idResponsableInscripto) && tipoContribuyenteIVA == codigosRetencionIIBB.infoRet[i].idResponsableInscripto) {
                                                                                            codigosRetencionIIBB.infoRet[i].importe_factura_pagar = codigosRetencionIIBB.infoRet[i].importe_factura_pagar;
                                                                                            codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(porcentajeFinal, 10);
                                                                                        } else {
                                                                                            // Si la Condición fiscal == Monotributista && Jurisdiccion Retencion calculada == Lugar Entrega && Lugar Entrega = Tucuman (924)
                                                                                        if (!isEmpty(tipoContribuyenteIVA) && !isEmpty(codigosRetencionIIBB.infoRet[i].idMonotrotributista) && tipoContribuyenteIVA == codigosRetencionIIBB.infoRet[i].idMonotrotributista) {
                                                                                                codigosRetencionIIBB.infoRet[i].importe_factura_pagar = codigosRetencionIIBB.infoRet[i].importe_factura_pagar;
                                                                                                codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(porcentajeFinal, 10);
                                                                                                // codigosRetencionIIBB.infoRet[i].importe_factura_pagar = totalTransaccion;
                                                                                            } else {
                                                                                                // No debe calcularse retención de TUCUMÁN por mala configuración de Padrón
                                                                                                ignorarRetencionTucuman = true;
                                                                                                codigosRetencionIIBB.infoRet[i].importe_factura_pagar = 0;
                                                                                                mensajeConfigTucumanErronea = "No se calculará retención de TUCUMÁN; el proveedor tiene que ser Responsable Inscripto o Monotributista y la jurisdicción de entrega: TUCUMÁN, para aplicar el Padrón.";
                                                                                                /* respuestaRetenciones.warning = true;
                                                                                                respuestaRetenciones.mensajeWarning.push(mensajeConfigTucumanErronea); */
                                                                                                log.debug("DEBUG", "No se calculará retención de TUCUMÁN; el proveedor tiene que ser Responsable Inscripto o Monotributista y la jurisdicción de entrega: TUCUMÁN, para aplicar el Padrón.");
                                                                                            }
                                                                                        }
                                                                                    } else {
                                                                                        // Si el tipo de contribuyente IIBB o estado de inscripción del padrón es Convenio Multilateral
                                                                                        if (!isEmpty(codigosRetencionIIBB.infoRet[i].estadoInscripcionPadron) && !isEmpty(codigosRetencionIIBB.infoRet[i].idConvenioMultilateral) && codigosRetencionIIBB.infoRet[i].estadoInscripcionPadron == codigosRetencionIIBB.infoRet[i].idConvenioMultilateral && !isEmpty(codigosRetencionIIBB.infoRet[i].porcentaje_alicuota_utilizar)) {

                                                                                            // Verifico si la dirección de entrega no es TUCUMÁN, para asignar el porcentaje cuando la sede no es tucuman
                                                                                            if (isEmpty(codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega) || codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega != 924) {
                                                                                                codigosRetencionIIBB.infoRet[i].porcentaje_alicuota_utilizar = codigosRetencionIIBB.infoRet[i].porcentajeAlicUtilSedeNoTucuman;
                                                                                            }

                                                                                            // Aplico el porcentaje de alicuota a utilizar porque es convenio multilateral 
                                                                                            if (codigosRetencionIIBB.infoRet[i].porcentaje_alicuota_utilizar.search("%") != -1) {
                                                                                                var porcentajeAlicuotaEspecial = codigosRetencionIIBB.infoRet[i].porcentaje_alicuota_utilizar.substring(0, codigosRetencionIIBB.infoRet[i].porcentaje_alicuota_utilizar.length - 1);
                                                                                                var countDecimalesAlicuotaEspecial = countDecimales(porcentajeAlicuotaEspecial) + 2;
                                                                                                porcentajeAlicuotaEspecial = parseFloat(porcentajeAlicuotaEspecial / 100, 10);
                                                                                                if (parseFloat(countDecimales(parseFloat(porcentajeAlicuotaEspecial, 10)), 10) > 13) {
                                                                                                    porcentajeAlicuotaEspecial = parseFloat(porcentajeAlicuotaEspecial, 10).toFixedOK(countDecimalesAlicuotaEspecial);
                                                                                                }
                                                                                            } else {
                                                                                                var porcentajeAlicuotaEspecial = (parseFloat(codigosRetencionIIBB.infoRet[i].porcentaje_alicuota_utilizar, 10) * 100);
                                                                                            }

                                                                                            var countDecimalesPorcentajeFinal = countDecimales(porcentajeFinal);
                                                                                            var countDecimalesPorcentajeAlicuotaEspecial = countDecimales(porcentajeAlicuotaEspecial);
                                                                                            var countDecimalesPorcentajeTotal = countDecimalesPorcentajeFinal + countDecimalesPorcentajeAlicuotaEspecial;
                                                                                            // porcentajeFinal = parseFloat(parseFloat(convertToInteger(porcentajeFinal), 10) * (parseFloat(convertToInteger(porcentajeAlicuotaEspecial), 10))/(100 * Math.pow(10, countDecimalesPorcentajeTotal)), 10);
                                                                                            porcentajeFinal = parseFloat(parseFloat(convertToInteger(porcentajeFinal), 10) * (parseFloat(convertToInteger(porcentajeAlicuotaEspecial), 10)) / (Math.pow(10, countDecimalesPorcentajeTotal)), 10);

                                                                                            // Si la Condición fiscal == Responsable Inscripto && Jurisdiccion Retencion calculada == Lugar Entrega && Lugar Entrega = Tucuman (924)
                                                                                            if (!isEmpty(tipoContribuyenteIVA) && !isEmpty(codigosRetencionIIBB.infoRet[i].idResponsableInscripto) && tipoContribuyenteIVA == codigosRetencionIIBB.infoRet[i].idResponsableInscripto && !isEmpty(codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega) && codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega == 924 && !isEmpty(codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) && codigosRetencionIIBB.infoRet[i].jurisdiccion == codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) {
                                                                                                codigosRetencionIIBB.infoRet[i].importe_factura_pagar = codigosRetencionIIBB.infoRet[i].importe_factura_pagar;
                                                                                                codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(porcentajeFinal, 10);
                                                                                            } else {
                                                                                                // Si la Condición fiscal == Monotributista && Jurisdiccion Retencion calculada == Lugar Entrega && Lugar Entrega = Tucuman (924)
                                                                                                if (!isEmpty(tipoContribuyenteIVA) && !isEmpty(codigosRetencionIIBB.infoRet[i].idMonotrotributista) && tipoContribuyenteIVA == codigosRetencionIIBB.infoRet[i].idMonotrotributista && !isEmpty(codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega) && codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega == 924 && !isEmpty(codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) && codigosRetencionIIBB.infoRet[i].jurisdiccion == codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) {
                                                                                                    codigosRetencionIIBB.infoRet[i].importe_factura_pagar = codigosRetencionIIBB.infoRet[i].importe_factura_pagar;
                                                                                                    codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(porcentajeFinal, 10);
                                                                                                    // codigosRetencionIIBB.infoRet[i].importe_factura_pagar = totalTransaccion;
                                                                                                } else {
                                                                                                    var coeficienteCero = false;
                                                                                                    // Verifico si el coeficiente es mayor a 0, para tomar en el caso de que sea 0 al porcentaje especial cuando el coeficiente es 0
                                                                                                    if (!isEmpty(codigosRetencionIIBB.infoRet[i].coeficienteRetencion) && codigosRetencionIIBB.infoRet[i].coeficienteRetencion > 0) {
                                                                                                        var countDecimalesCoeficiente = countDecimales(codigosRetencionIIBB.infoRet[i].coeficienteRetencion);
                                                                                                    } else {
                                                                                                        coeficienteCero = true;
                                                                                                        if (codigosRetencionIIBB.infoRet[i].porcentajeEspecialCoeficienteCero.search("%") != -1) {
                                                                                                            var porcentajeEspecialCoeficienteCero = codigosRetencionIIBB.infoRet[i].porcentajeEspecialCoeficienteCero.substring(0, codigosRetencionIIBB.infoRet[i].porcentajeEspecialCoeficienteCero.length - 1);
                                                                                                        } else {
                                                                                                            var porcentajeEspecialCoeficienteCero = parseFloat(codigosRetencionIIBB.infoRet[i].porcentajeEspecialCoeficienteCero, 10);
                                                                                                        }
                                                                                                        /* var countDecimalesCoeficienteEspecialCero = countDecimales(porcentajeEspecialCoeficienteCero) + 2;
                                                                                                        porcentajeEspecialCoeficienteCero = parseFloat(porcentajeEspecialCoeficienteCero/100, 10);
                                                                                                        if (parseFloat(countDecimales(parseFloat(porcentajeEspecialCoeficienteCero, 10)), 10) > 13) {
                                                                                                            porcentajeEspecialCoeficienteCero = parseFloat(porcentajeEspecialCoeficienteCero, 10).toFixedOK(countDecimalesCoeficienteEspecialCero);
                                                                                                        } */
                                                                                                        /* var countDecimalesCoeficienteEspecialCero = countDecimales(porcentajeEspecialCoeficienteCero) + 2;
                                                                                                        porcentajeEspecialCoeficienteCero = parseFloat(porcentajeEspecialCoeficienteCero / 100, 10);
                                                                                                        if (parseFloat(countDecimales(parseFloat(porcentajeEspecialCoeficienteCero, 10)), 10) > 13) {
                                                                                                            porcentajeEspecialCoeficienteCero = parseFloat(porcentajeEspecialCoeficienteCero, 10).toFixedOK(countDecimalesCoeficienteEspecialCero);
                                                                                                        }
                                                                                                        else
                                                                                                            var porcentajeEspecialCoeficienteCero = (parseFloat(codigosRetencionIIBB.infoRet[i].porcentajeEspecialCoeficienteCero, 10) * 100);
    
                                                                                                        var countDecimalesPorcentEspecialCoefCero = countDecimales(porcentajeEspecialCoeficienteCero);
                                                                                                        codigosRetencionIIBB.infoRet[i].coeficienteRetencion = parseFloat(parseFloat(convertToInteger(porcentajeEspecialCoeficienteCero), 10) / (Math.pow(10, countDecimalesPorcentEspecialCoefCero)), 10); */
                                                                                                        // codigosRetencionIIBB.infoRet[i].coeficienteRetencion = parseFloat(porcentajeEspecialCoeficienteCero, 10);
                                                                                                        porcentajeFinal = parseFloat(porcentajeEspecialCoeficienteCero, 10);
                                                                                                        // var countDecimalesCoeficiente = countDecimales(codigosRetencionIIBB.infoRet[i].coeficienteRetencion);
                                                                                                    }

                                                                                                    // Si la Condición fiscal == Responsable inscripto && Lugar Entrega <> Tucuman (924) y la empresa no tiene sede en tucumán
                                                                                                    if (!isEmpty(tipoContribuyenteIVA) && !isEmpty(codigosRetencionIIBB.infoRet[i].idResponsableInscripto) && tipoContribuyenteIVA == codigosRetencionIIBB.infoRet[i].idResponsableInscripto && (isEmpty(codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega) || codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega != 924) && (isEmpty(codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) || codigosRetencionIIBB.infoRet[i].jurisdiccion != codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) && jurisdiccionEmpresa != codigosRetencionIIBB.infoRet[i].jurisdiccion) {
                                                                                                        if (!coeficienteCero) {
                                                                                                            var countDecimalesImporte = countDecimales(codigosRetencionIIBB.infoRet[i].importe_factura_pagar);
                                                                                                            var countDecimalesTotales = countDecimalesImporte + countDecimalesCoeficiente;
                                                                                                            codigosRetencionIIBB.infoRet[i].importe_factura_pagar = parseFloat(parseFloat(parseFloat(convertToInteger(codigosRetencionIIBB.infoRet[i].importe_factura_pagar), 10) * parseFloat(convertToInteger(codigosRetencionIIBB.infoRet[i].coeficienteRetencion), 10), 10) / Math.pow(10, countDecimalesTotales), 10);
                                                                                                            codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(porcentajeFinal, 10);
                                                                                                        } else {
                                                                                                            codigosRetencionIIBB.infoRet[i].importe_factura_pagar = parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10);
                                                                                                            codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(porcentajeFinal, 10);
                                                                                                            // codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(codigosRetencionIIBB.infoRet[i].coeficienteRetencion, 10);
                                                                                                        }
                                                                                                    } else {
                                                                                                        // Si la Condición fiscal == Monotibutista && Lugar Entrega <> Tucuman (924) y la empresa no tiene sede en tucumán
                                                                                                        if (!isEmpty(tipoContribuyenteIVA) && !isEmpty(codigosRetencionIIBB.infoRet[i].idMonotrotributista) && tipoContribuyenteIVA == codigosRetencionIIBB.infoRet[i].idMonotrotributista && (isEmpty(codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega) || codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega != 924) && (isEmpty(codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) || codigosRetencionIIBB.infoRet[i].jurisdiccion != codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) && jurisdiccionEmpresa != codigosRetencionIIBB.infoRet[i].jurisdiccion) {
                                                                                                            if (!coeficienteCero) {
                                                                                                                // var countDecimalesImporte = countDecimales(totalTransaccion);
                                                                                                                var countDecimalesImporte = countDecimales(codigosRetencionIIBB.infoRet[i].importe_factura_pagar);
                                                                                                                var countDecimalesTotales = countDecimalesImporte + countDecimalesCoeficiente;
                                                                                                                // codigosRetencionIIBB.infoRet[i].importe_factura_pagar = parseFloat(parseFloat(parseFloat(convertToInteger(totalTransaccion), 10) * parseFloat(convertToInteger(codigosRetencionIIBB.infoRet[i].coeficienteRetencion), 10), 10)/Math.pow(10, countDecimalesTotales), 10);
                                                                                                                codigosRetencionIIBB.infoRet[i].importe_factura_pagar = parseFloat(parseFloat(parseFloat(convertToInteger(codigosRetencionIIBB.infoRet[i].importe_factura_pagar), 10) * parseFloat(convertToInteger(codigosRetencionIIBB.infoRet[i].coeficienteRetencion), 10), 10) / Math.pow(10, countDecimalesTotales), 10);
                                                                                                                codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(porcentajeFinal, 10);
                                                                                                            } else {
                                                                                                                codigosRetencionIIBB.infoRet[i].importe_factura_pagar = parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10);
                                                                                                                codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(porcentajeFinal, 10);
                                                                                                                // codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(codigosRetencionIIBB.infoRet[i].coeficienteRetencion, 10);
                                                                                                            }
                                                                                                        } else {
                                                                                                            ignorarRetencionTucuman = true;
                                                                                                            codigosRetencionIIBB.infoRet[i].importe_factura_pagar = 0;
                                                                                                            mensajeConfigTucumanErronea = "No se calculará retención de TUCUMÁN; el proveedor tiene que ser Responsable Inscripto o Monotributista para aplicar el Padrón de la jurisdicción de TUCUMÁN.";
                                                                                                            /* respuestaRetenciones.warning = true;
                                                                                                            respuestaRetenciones.mensajeWarning.push(mensajeConfigTucumanErronea); */
                                                                                                            log.debug("DEBUG", "No se calculará retención de TUCUMÁN; el proveedor tiene que ser Responsable Inscripto o Monotributista para aplicar el Padrón de la jurisdicción de TUCUMÁN.");
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                            }
                                                                                        } else {
                                                                                            ignorarRetencionTucuman = true;
                                                                                            codigosRetencionIIBB.infoRet[i].importe_factura_pagar = 0;
                                                                                            mensajeConfigTucumanErronea = "No se calculará retención de TUCUMÁN; la configuración del Padrón se encuentra errónea; debe ser Convenio Multilateral o Convenio Local y debe llenar el \"Porcentaje Alícuota Utilizar\" en el RT IIBB Configuración Detalle";
                                                                                            /* respuestaRetenciones.warning = true;
                                                                                            respuestaRetenciones.mensajeWarning.push(mensajeConfigTucumanErronea); */
                                                                                            log.debug("DEBUG", "No se calculará retención de TUCUMÁN; la configuración del Padrón se encuentra errónea; debe ser Convenio Multilateral o Convenio Local y debe llenar el \"Porcentaje Alícuota Utilizar\" en el RT IIBB Configuración Detalle");
                                                                                        }
                                                                                    }
                                                                                } else { // No es por configuración de Padrón el cálculo de Retenciones
                                                                                    // Condición fiscal es Responsable Inscripto o Monotributista y lugar de entrega es TUCUMÁN
                                                                                    if (!isEmpty(tipoContribuyenteIVA) && !isEmpty(codigosRetencionIIBB.infoRet[i].idResponsableInscripto) && !isEmpty(codigosRetencionIIBB.infoRet[i].idMonotrotributista) && (tipoContribuyenteIVA == codigosRetencionIIBB.infoRet[i].idResponsableInscripto || tipoContribuyenteIVA == codigosRetencionIIBB.infoRet[i].idMonotrotributista) && !isEmpty(codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega) && codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega == 924 && !isEmpty(codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) && codigosRetencionIIBB.infoRet[i].jurisdiccion == codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) {
                                                                                        codigosRetencionIIBB.infoRet[i].importe_factura_pagar = codigosRetencionIIBB.infoRet[i].importe_factura_pagar;
                                                                                        // codigosRetencionIIBB.infoRet[i].importe_factura_pagar = totalTransaccion;
                                                                                    } else {
                                                                                        // Condición fiscal es Responsable Inscripto o Monotributista y lugar de entrega NO es TUCUMÁN
                                                                                        if (!isEmpty(tipoContribuyenteIVA) && !isEmpty(codigosRetencionIIBB.infoRet[i].idResponsableInscripto) && !isEmpty(codigosRetencionIIBB.infoRet[i].idMonotrotributista) && (tipoContribuyenteIVA == codigosRetencionIIBB.infoRet[i].idResponsableInscripto || tipoContribuyenteIVA == codigosRetencionIIBB.infoRet[i].idMonotrotributista) && (isEmpty(codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega) || codigosRetencionIIBB.infoRet[i].codigoJurisdiccionDireccionEntrega != 924) && (isEmpty(codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) || codigosRetencionIIBB.infoRet[i].jurisdiccion != codigosRetencionIIBB.infoRet[i].idJurisdiccionDireccionEntrega) && !isEmpty(codigosRetencionIIBB.infoRet[i].alicuota_especial)) {
                                                                                            codigosRetencionIIBB.infoRet[i].importe_factura_pagar = codigosRetencionIIBB.infoRet[i].importe_factura_pagar;
                                                                                            // codigosRetencionIIBB.infoRet[i].importe_factura_pagar = totalTransaccion;
                                                                                            if (codigosRetencionIIBB.infoRet[i].alicuota_especial.search("%") != -1) {
                                                                                                var alicuotaEspecial = codigosRetencionIIBB.infoRet[i].alicuota_especial.substring(0, codigosRetencionIIBB.infoRet[i].alicuota_especial.length - 1);
                                                                                                /* var countDecimalesAlicuotaEspecialConfigGen = countDecimales(alicuotaEspecial) + 2;
                                                                                                alicuotaEspecial = parseFloat(alicuotaEspecial/100, 10);
                                                                                                if (parseFloat(countDecimales(parseFloat(alicuotaEspecial, 10)), 10) > 13) {
                                                                                                    alicuotaEspecial = parseFloat(alicuotaEspecial, 10).toFixedOK(countDecimalesAlicuotaEspecialConfigGen);
                                                                                                } */
                                                                                            } else {
                                                                                                var alicuotaEspecial = (parseFloat(codigosRetencionIIBB.infoRet[i].alicuota_especial, 10) * 100);
                                                                                            }

                                                                                            porcentajeFinal = parseFloat(parseFloat(alicuotaEspecial, 10), 10);
                                                                                            codigosRetencionIIBB.infoRet[i].porcentajeRetencion = parseFloat(porcentajeFinal, 10);
                                                                                            if (porcentajeFinal <= parseFloat(0, 10))
                                                                                                porcentajeAlicuotaEspecialCero = true;
                                                                                        } else {
                                                                                            ignorarRetencionTucuman = true;
                                                                                            codigosRetencionIIBB.infoRet[i].importe_factura_pagar = 0;
                                                                                            mensajeConfigTucumanErronea = "No se calculará retención de TUCUMÁN; el proveedor tiene que ser Responsable Inscripto o Monotributista y debe llenar la \"Alícuota Especial\" en el RT IIBB Configuración Detalle.";
                                                                                            /* respuestaRetenciones.warning = true;
                                                                                            respuestaRetenciones.mensajeWarning.push(mensajeConfigTucumanErronea); */
                                                                                            log.debug("DEBUG", "No se calculará retención de TUCUMÁN; el proveedor tiene que ser Responsable Inscripto o Monotributista y debe llenar la \"Alícuota Especial\" en el RT IIBB Configuración Detalle.");
                                                                                        }
                                                                                    }
                                                                                }
                                                                            }
                                                                            // FIN - Si la retención a procesar es la de Tucuman.


                                                                            // INICIO - Verificación si la retención es de CÓRDOBA
                                                                            if (!isEmpty(codigosRetencionIIBB.infoRet[i].jurisdiccion) && !isEmpty(jurisdiccionCordoba) && codigosRetencionIIBB.infoRet[i].jurisdiccion == jurisdiccionCordoba) {

                                                                                if (!isEmpty(codigosRetencionIIBB.infoRet[i].porcentajeEspecialUtilizarBI)) {

                                                                                    // Se verifica si la alicuota es de proveedores normales
                                                                                    if (codigosRetencionIIBB.infoRet[i].esRetencionAliados) {

                                                                                        codigosRetencionIIBB.infoRet[i].importe_factura_pagar = codigosRetencionIIBB.infoRet[i].importe_total_factura_aliados * porcentajeEspecialUtilizarBI;

                                                                                        if (parseFloat(countDecimales(parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10)), 10) > 10)
                                                                                            codigosRetencionIIBB.infoRet[i].importe_factura_pagar = parseFloat(parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10).toFixedOK(2), 10);

                                                                                    }
                                                                                } else {
                                                                                    respuestaRetenciones.warning = true;
                                                                                    respuestaRetenciones.mensajeWarning.push("No se realizará el cálculo de retención para la jurisdicción de " + codigosRetencionIIBB.infoRet[i].jurisdiccionTexto + ", porque el porcentaje especial a utilizar de la base imponible no se encuentra configurado.");
                                                                                    codigosRetencionIIBB.infoRet[i].importe_factura_pagar = 0;
                                                                                }
                                                                            } // FIN - Verificación si la retención es de CÓRDOBA

                                                                            log.debug("L54 - Calculo Retenciones", "LINE 2415 - codigosRetencionIIBB.infoRe[i]: " + JSON.stringify(codigosRetencionIIBB.infoRet[i]) + " - porcentajeFinal: " + porcentajeFinal + " - ignorarRetencionTucuman: " + ignorarRetencionTucuman + " - porcentajeAlicuotaEspecialCero: " + porcentajeAlicuotaEspecialCero);

                                                                            if (!isEmpty(porcentajeFinal) && !ignorarRetencionTucuman && !porcentajeAlicuotaEspecialCero && !isNaN(porcentajeFinal) && (porcentajeFinal >= 0 && codigosRetencionIIBB.infoRet[i].jurisdiccionCodigo == 924 || porcentajeFinal > 0) && !isNaN(codigosRetencionIIBB.infoRet[i].importe_factura_pagar) && (((parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10) >= 0) && (codigosRetencionIIBB.infoRet[i].jurisdiccionCodigo == 924)) || (parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10) > 0))) {


                                                                                codigosRetencionIIBB.infoRet[i].base_calculo_retencion = parseFloat(codigosRetencionIIBB.infoRet[i].importe_factura_pagar, 10);
                                                                                codigosRetencionIIBB.infoRet[i].base_calculo_retencion_impresion = parseFloat(codigosRetencionIIBB.infoRet[i].base_calculo_retencion, 10);

                                                                                var objRetencionIIBB = getRetencion(entity, "iibb", codigosRetencionIIBB.infoRet[i].codigo, codigosRetencionIIBB.infoRet[i].base_calculo_retencion, id_posting_period, 0, tasa_cambio_pago, codigosRetencionIIBB.infoRet[i].porcentajeRetencion, true, "", 0);
                                                                                //var objRetencionIIBB = getRetencion(entity, "iibb", codigosRetencionIIBB.infoRet[i].codigo, codigosRetencionIIBB.infoRet[i].base_calculo_retencion, id_posting_period, 0, tasa_cambio_pago, porcentajeFinal, true, "", 0);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - objRetencionIIBB: " + JSON.stringify(objRetencionIIBB) + " ** TIEMPO" + new Date());

                                                                                codigosRetencionIIBB.infoRet[i].importe_retencion = objRetencionIIBB.importeRetencion;
                                                                                //codigosRetencionIIBB.infoRet[i].importe_retencion = parseFloat(codigosRetencionIIBB.infoRet[i].importe_retencion, 10).toFixedOK(2); // En Moneda Base sin redondear
                                                                                codigosRetencionIIBB.infoRet[i].importe_retencion = parseFloat(codigosRetencionIIBB.infoRet[i].importe_retencion, 10); // En Moneda Base sin redondear

                                                                                // Nuevo - Alicuota Retencion
                                                                                //codigosRetencionIIBB.infoRet[i].alicuota = parseFloat(objRetencionIIBB.alicuotaRetencion, 10).toFixedOK(2);
                                                                                codigosRetencionIIBB.infoRet[i].alicuota = parseFloat(objRetencionIIBB.alicuotaRetencion, 10);
                                                                                //codigosRetencionIIBB.infoRet[i].alicuota = parseFloat(porcentajeFinal, 10);
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - codigosRetencionIIBB.infoRet[i].alicuota: " + codigosRetencionIIBB.infoRet[i].alicuota + " ** TIEMPO" + new Date());
                                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - codigosRetencionIIBB.infoRet[i].importe_retencion: " + codigosRetencionIIBB.infoRet[i].importe_retencion + " ** TIEMPO" + new Date());

                                                                                if (objRetencionIIBB.warning) {
                                                                                    respuestaRetenciones.warning = true;
                                                                                    respuestaRetenciones.mensajeWarning.push(objRetencionIIBB.mensaje);
                                                                                }
                                                                            } else {
                                                                                if (!isEmpty(codigosRetencionIIBB.infoRet[i].jurisdiccion) && ((codigosRetencionIIBB.infoRet[i].jurisdiccion == 24) || (codigosRetencionIIBB.infoRet[i].jurisdiccionCodigo == 924) || (codigosRetencionIIBB.infoRet[i].jurisdiccionTexto.search("924") != -1)) && isEmpty(mensajeConfigTucumanErronea) && !porcentajeAlicuotaEspecialCero && ignorarRetencionTucuman) {
                                                                                    mensajeConfigTucumanErronea = "No se realizará el cálculo de retención para la jurisdicción de TUCUMÁN porque existe un error en el proceso de cálculo o la configuración se encuentra errónea.";
                                                                                    /* respuestaRetenciones.warning = true;
                                                                                    respuestaRetenciones.mensajeWarning.push(mensajeConfigTucumanErronea); */
                                                                                    log.error("L54 - Calculo Retenciones", "No se realizará el cálculo de retención para la jurisdicción de TUCUMÁN porque existe un error en el proceso de cálculo o la configuración se encuentra errónea.");
                                                                                } else {
                                                                                    if (porcentajeAlicuotaEspecialCero) {
                                                                                        mensajeConfigTucumanErronea = "No se realizará el cálculo de retención para la jurisdicción de TUCUMÁN porque la alícuota especial configurada es 0%.";
                                                                                        /* respuestaRetenciones.warning = true;
                                                                                        respuestaRetenciones.mensajeWarning.push(mensajeConfigTucumanErronea); */
                                                                                        log.error("L54 - Calculo Retenciones", "No se realizará el cálculo de retención para la jurisdicción de TUCUMÁN porque la alícuota especial configurada es 0%.");
                                                                                    }
                                                                                }
                                                                            }
                                                                        } else {
                                                                            mensajesErrores = "No se realizará el cálculo de retención para la jurisdicción de " + codigosRetencionIIBB.infoRet[i].jurisdiccionTexto + " porque no se supera el mínimo de base de cálculo de retención configurado.";
                                                                            respuestaRetenciones.warning = true;
                                                                            respuestaRetenciones.mensajeWarning.push(mensajesErrores);
                                                                            log.debug("calcularRetencionesVentas", "mensajesErrores: " + mensajesErrores);
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }//FIN if (esAgenteRetencionIIBB)

                                                        log.audit("Governance Monitoring", "LINE 974 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - codigosRetencionIIBB.infoRet: " + JSON.stringify(codigosRetencionIIBB.infoRet) + " ** TIEMPO" + new Date());

                                                        log.audit("Governance Monitoring", "LINE 978 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        // Solo si la compania es Agente de Retención del regimen y si el proveedor esta inscripto al regimen
                                                        if (esAgenteRetencionGan) {

                                                            if (estaInscriptoRegimenGan) {

                                                                for (var i = 0; retencion_ganancias != null && i < retencion_ganancias.length; i++) {

                                                                    if ((parseFloat(retencion_ganancias[i].importe_retencion, 10) > 0.00) && (parseFloat(retencion_ganancias[i].base_calculo_retencion, 10) > 0.00)) {

                                                                        var informacionRetencion = null;
                                                                        var retencionOk = false;
                                                                        var objGanancias = new Object();

                                                                        var resultInfRetencion = paramRetenciones.filter(function (obj) {
                                                                            return (obj.codigo == retencion_ganancias[i].codigo && obj.tipoContGAN.split(",").includes(tipoContGAN) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                        });

                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - resultInfRetencion: " + JSON.stringify(resultInfRetencion) + " ** TIEMPO" + new Date());

                                                                        if (!isEmpty(resultInfRetencion) && resultInfRetencion.length > 0) {
                                                                            //var informacionRetencion = resultInfRetencion[0].tipo_ret;
                                                                            var informacionRetencion = new Object();
                                                                            informacionRetencion.codigo = resultInfRetencion[0].codRetencion;
                                                                            informacionRetencion.tipo = resultInfRetencion[0].tipo_ret;
                                                                            informacionRetencion.descripcion = resultInfRetencion[0].desRetencion;
                                                                        }

                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - informacionRetencion Ganancias: " + JSON.stringify(informacionRetencion) + " ** TIEMPO" + new Date());
                                                                        //informacionRetencion = getInformacionRetencion(retencion_ganancias[i].codigo);
                                                                        if (informacionRetencion != null) {
                                                                            //nlapiSelectNewLineItem("custpage_sublist_retenciones");

                                                                            objGanancias.retencion = informacionRetencion.tipo;
                                                                            objGanancias.tipo_ret = retencion_ganancias[i].codigo;
                                                                            objGanancias.jurisdiccion = "";
                                                                            //objGanancias.condicion = condicion_ganancias;
                                                                            objGanancias.condicion = condicionesRetencion.codRetGAN;
                                                                            objGanancias.neto_bill = parseFloat(numberTruncTwoDec(parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            objGanancias.base_calculo = parseFloat(numberTruncTwoDec(parseFloat(retencion_ganancias[i].base_calculo_retencion, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            objGanancias.base_calculo_imp = parseFloat(numberTruncTwoDec(parseFloat(retencion_ganancias[i].base_calculo_retencion_impresion, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            // objGanancias.imp_retencion = parseFloat(parseFloat(retencion_ganancias[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10).toFixedOK(2);

                                                                            //------ Inicio - 23-01-2020: JSalazar. Cambios para incorporar funcionalidad de redondeo de eArciba en retenciones de ganancias --------//
                                                                            var cantDecImpRetCodigoRet = countDecimales(parseFloat(retencion_ganancias[i].importe_retencion, 10));
                                                                            var cantDecTasaCambioPago = countDecimales(parseFloat(tasa_cambio_pago, 10));
                                                                            var cantDecTotalImpRetAux = cantDecImpRetCodigoRet - cantDecTasaCambioPago;
                                                                            log.audit("l54 - calculo retenciones", "LINE 2154 - Retención Ganancias - retencion_ganancias[i].importe_retencion: " + retencion_ganancias[i].importe_retencion + " --- tasa_cambio_pago: " + tasa_cambio_pago + " --- ÍNDICE i: " + i);
                                                                            var imp_retencion_aux = Math.abs(parseFloat(parseFloat(convertToInteger(retencion_ganancias[i].importe_retencion), 10) / parseFloat(convertToInteger(tasa_cambio_pago), 10), 10));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2156 - Retención Ganancias - convertToInteger(tasa_cambio_pago): " + convertToInteger(tasa_cambio_pago) + ", convertToInteger(retencion_ganancias[i].importe_retencion)" + convertToInteger(retencion_ganancias[i].importe_retencion));
                                                                            var cantDecImpRetAux = countDecimales(parseFloat(imp_retencion_aux, 10));
                                                                            var cantDecImpRetFinal = cantDecImpRetAux + cantDecTotalImpRetAux;
                                                                            var imp_retencion = Math.abs(parseFloat(parseFloat(convertToInteger(imp_retencion_aux), 10) / Math.pow(10, cantDecImpRetFinal), 10));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2160 - Retención Ganancias - imp_retencion_aux: " + imp_retencion_aux + ", cantDecImpRetCodigoRet: " + cantDecImpRetCodigoRet + ", cantDecTasaCambioPago: " + cantDecTasaCambioPago + ", cantDecTotalImpRetAux: " + cantDecTotalImpRetAux + ", cantDecImpRetAux: " + cantDecImpRetAux + ", cantDecImpRetFinal: " + cantDecImpRetFinal + ", imp_retencion: " + imp_retencion);
                                                                            var monto_suj_ret_moneda_local = 0.0;
                                                                            var alicuota = parseFloat(retencion_ganancias[i].alicuota, 10);
                                                                            var cantDecPorcentFinal = 0; // porcentajeFinal
                                                                            var cantDecImporteRetencion = 0; // importeNetoCalculadoRedondeado
                                                                            var cantDecTipoCambio = 0;
                                                                            var cantDecMontoImpRetMonedaLocal = 0;

                                                                            objGanancias.imp_retencion = parseFloat(numberTruncTwoDec(imp_retencion), 10); // redondeado a 2 decimales para abajo o truncado a 2 decimales
                                                                            cantDecImporteRetencion = countDecimales(objGanancias.imp_retencion);
                                                                            cantDecTipoCambio = countDecimales(tasa_cambio_pago);
                                                                            cantDecPorcentFinal = countDecimales(alicuota);
                                                                            cantDecMontoImpRetMonedaLocal = cantDecTipoCambio + cantDecImporteRetencion - cantDecPorcentFinal;
                                                                            monto_suj_ret_moneda_local = Math.abs(parseFloat(parseFloat((parseFloat((parseFloat(parseFloat(convertToInteger(objGanancias.imp_retencion), 10) * parseFloat(convertToInteger(tasa_cambio_pago), 10) * 100, 10) / parseFloat(convertToInteger(alicuota), 10)), 10) / Math.pow(10, cantDecMontoImpRetMonedaLocal)), 10), 10));

                                                                            if (objGanancias.tipo_ret != retencionHonorarios) {
                                                                                objGanancias.monto_suj_ret_moneda_local = parseFloat(numberTruncTwoDec(monto_suj_ret_moneda_local), 10); // L54 - Monto Sujeto Retención (Moneda Local)
                                                                            } else {
                                                                                objGanancias.monto_suj_ret_moneda_local = parseFloat(numberTruncTwoDec(parseFloat(objGanancias.base_calculo, 10) * parseFloat(tasa_cambio_pago, 10)), 10); // L54 - Monto Sujeto Retención (Moneda Local)
                                                                            }

                                                                            objGanancias.diferenciaRedondeo = parseFloat(numberToFixedDown(parseFloat(imp_retencion - objGanancias.imp_retencion, 10), 12), 10);
                                                                            objGanancias.base_calculo_original = objGanancias.base_calculo;
                                                                            log.audit("l54 - calculo retenciones", "LINE 2177 - Retención Ganancias - imp_retencion cortado a 14 dígitos: " + imp_retencion.toString().substr(0, 14));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2178 - Retención Ganancias - imp_retencion: " + imp_retencion);
                                                                            objGanancias.imp_retencion_original = imp_retencion.toString().substr(0, 14); // sin redondeos
                                                                            //------ Fin - 23-01-2020: JSalazar. Cambios para incorporar funcionalidad de redondeo de eArciba en retenciones de ganancias --------//

                                                                            objGanancias.condicionID = "";
                                                                            objGanancias.alicuota = alicuota;
                                                                            objGanancias.certExencion = "";
                                                                            objGanancias.tipoExencion = "";
                                                                            objGanancias.fcaducidadExencion = "";
                                                                            objGanancias.numerador_cod = "num_ret_ganancias";

                                                                            if (!isNaN(objGanancias.imp_retencion) && !isNaN(objGanancias.base_calculo) && parseFloat(objGanancias.imp_retencion, 10) > 0.00 && parseFloat(objGanancias.base_calculo, 10) > 0.00) {
                                                                                respuestaRetenciones.retencion_ganancias.push(objGanancias);
                                                                                retencionOk = true;
                                                                            }
                                                                        }

                                                                        if (retencionOk) {
                                                                            // imp_retencion_ganancias = parseFloat(parseFloat(imp_retencion_ganancias, 10) + parseFloat(parseFloat(retencion_ganancias[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10), 10).toFixedOK(2);
                                                                            imp_retencion_ganancias = parseFloat(parseFloat(imp_retencion_ganancias, 10) + parseFloat(objGanancias.imp_retencion, 10), 10);
                                                                            // total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(parseFloat(retencion_ganancias[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10), 10).toFixedOK(2);
                                                                            total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(objGanancias.imp_retencion, 10), 10);
                                                                        }
                                                                    }
                                                                }
                                                                //nlapiSetFieldValue("custbody_l54_gan_imp_a_retener", imp_retencion_ganancias, false);
                                                                respuestaRetenciones.imp_retencion_ganancias = imp_retencion_ganancias;
                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - respuestaRetenciones.retencion_ganancias: " + JSON.stringify(respuestaRetenciones.retencion_ganancias) + " ** TIEMPO" + new Date());

                                                            }
                                                        }//FIN 2do if (esAgenteRetencionGan)

                                                        log.audit("Governance Monitoring", "LINE 1043 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        if (esAgenteRetencionSUSS) {

                                                            if (estaInscriptoRegimenSUSS) {
                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - retencion_suss: " + JSON.stringify(retencion_suss));
                                                                for (var i = 0; retencion_suss != null && i < retencion_suss.length; i++) {

                                                                    if ((parseFloat(retencion_suss[i].importe_retencion, 10) > 0.00) && (parseFloat(retencion_suss[i].base_calculo_retencion, 10) > 0.00)) {

                                                                        var informacionRetencion = null;
                                                                        var retencionOk = false;
                                                                        var objSUSS = new Object();

                                                                        var resultInfRetencion = paramRetenciones.filter(function (obj) {
                                                                            return (obj.codigo == retencion_suss[i].codigo && obj.tipoContSUSS.split(",").includes(tipoContSUSS) && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                        });

                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - resultInfRetencion: " + JSON.stringify(resultInfRetencion) + " ** TIEMPO" + new Date());

                                                                        if (!isEmpty(resultInfRetencion) && resultInfRetencion.length > 0) {
                                                                            //var informacionRetencion = resultInfRetencion[0].tipo_ret;
                                                                            var informacionRetencion = new Object();
                                                                            informacionRetencion.codigo = resultInfRetencion[0].codRetencion;
                                                                            informacionRetencion.tipo = resultInfRetencion[0].tipo_ret;
                                                                            informacionRetencion.descripcion = resultInfRetencion[0].desRetencion;
                                                                        }
                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - informacionRetencion: " + JSON.stringify(informacionRetencion));

                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - informacionRetencion: " + JSON.stringify(informacionRetencion) + " ** TIEMPO" + new Date());

                                                                        //informacionRetencion = getInformacionRetencion(retencion_suss[i].codigo);
                                                                        if (informacionRetencion != null) {

                                                                            objSUSS.retencion = informacionRetencion.tipo;
                                                                            objSUSS.tipo_ret = retencion_suss[i].codigo;
                                                                            objSUSS.jurisdiccion = "";
                                                                            //objSUSS.condicion = condicion_suss;
                                                                            objSUSS.condicion = condicionesRetencion.codRetSUSS;
                                                                            objSUSS.neto_bill = parseFloat(numberTruncTwoDec(parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            objSUSS.base_calculo = parseFloat(numberTruncTwoDec(parseFloat(retencion_suss[i].base_calculo_retencion, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            objSUSS.base_calculo_imp = parseFloat(numberTruncTwoDec(parseFloat(retencion_suss[i].base_calculo_retencion_impresion, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            // objSUSS.imp_retencion = parseFloat(parseFloat(retencion_suss[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10).toFixedOK(2);

                                                                            //------ Inicio - 23-01-2020: JSalazar. Cambios para incorporar funcionalidad de redondeo de eArciba en retenciones de SUSS --------//
                                                                            var cantDecImpRetCodigoRet = countDecimales(parseFloat(retencion_suss[i].importe_retencion, 10));
                                                                            var cantDecTasaCambioPago = countDecimales(parseFloat(tasa_cambio_pago, 10));
                                                                            var cantDecTotalImpRetAux = cantDecImpRetCodigoRet - cantDecTasaCambioPago;
                                                                            log.audit("l54 - calculo retenciones", "LINE 2250 - Retención SUSS - retencion_suss[i].importe_retencion: " + retencion_suss[i].importe_retencion + " --- tasa_cambio_pago: " + tasa_cambio_pago + " --- ÍNDICE i: " + i);
                                                                            var imp_retencion_aux = Math.abs(parseFloat(parseFloat(convertToInteger(retencion_suss[i].importe_retencion), 10) / parseFloat(convertToInteger(tasa_cambio_pago), 10), 10));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2252 - Retención SUSS - convertToInteger(tasa_cambio_pago): " + convertToInteger(tasa_cambio_pago) + ", convertToInteger(retencion_suss[i].importe_retencion)" + convertToInteger(retencion_suss[i].importe_retencion));
                                                                            var cantDecImpRetAux = countDecimales(parseFloat(imp_retencion_aux, 10));
                                                                            var cantDecImpRetFinal = cantDecImpRetAux + cantDecTotalImpRetAux;
                                                                            var imp_retencion = Math.abs(parseFloat(parseFloat(convertToInteger(imp_retencion_aux), 10) / Math.pow(10, cantDecImpRetFinal), 10));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2256 - Retención SUSS - imp_retencion_aux: " + imp_retencion_aux + ", cantDecImpRetCodigoRet: " + cantDecImpRetCodigoRet + ", cantDecTasaCambioPago: " + cantDecTasaCambioPago + ", cantDecTotalImpRetAux: " + cantDecTotalImpRetAux + ", cantDecImpRetAux: " + cantDecImpRetAux + ", cantDecImpRetFinal: " + cantDecImpRetFinal + ", imp_retencion: " + imp_retencion);
                                                                            var monto_suj_ret_moneda_local = 0.0;
                                                                            var alicuota = parseFloat(retencion_suss[i].alicuota, 10);
                                                                            var cantDecPorcentFinal = 0; // porcentajeFinal
                                                                            var cantDecImporteRetencion = 0; // importeNetoCalculadoRedondeado
                                                                            var cantDecTipoCambio = 0;
                                                                            var cantDecMontoImpRetMonedaLocal = 0;

                                                                            objSUSS.imp_retencion = parseFloat(numberTruncTwoDec(imp_retencion), 10); // redondeado a 2 decimales para abajo o truncado a 2 decimales
                                                                            cantDecImporteRetencion = countDecimales(objSUSS.imp_retencion);
                                                                            cantDecTipoCambio = countDecimales(tasa_cambio_pago);
                                                                            cantDecPorcentFinal = countDecimales(alicuota);
                                                                            cantDecMontoImpRetMonedaLocal = cantDecTipoCambio + cantDecImporteRetencion - cantDecPorcentFinal;
                                                                            monto_suj_ret_moneda_local = Math.abs(parseFloat(parseFloat((parseFloat((parseFloat(parseFloat(convertToInteger(objSUSS.imp_retencion), 10) * parseFloat(convertToInteger(tasa_cambio_pago), 10) * 100, 10) / parseFloat(convertToInteger(alicuota), 10)), 10) / Math.pow(10, cantDecMontoImpRetMonedaLocal)), 10), 10));
                                                                            objSUSS.monto_suj_ret_moneda_local = parseFloat(numberTruncTwoDec(monto_suj_ret_moneda_local), 10); // L54 - Monto Sujeto Retención (Moneda Local)
                                                                            objSUSS.diferenciaRedondeo = parseFloat(numberToFixedDown(parseFloat(imp_retencion - objSUSS.imp_retencion, 10), 12), 10);
                                                                            objSUSS.base_calculo_original = objSUSS.base_calculo;
                                                                            log.audit("l54 - calculo retenciones", "LINE 2273 - Retención SUSS - imp_retencion cortado a 14 dígitos: " + imp_retencion.toString().substr(0, 14));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2274 - Retención SUSS - imp_retencion: " + imp_retencion);
                                                                            objSUSS.imp_retencion_original = imp_retencion.toString().substr(0, 14); // sin redondeos
                                                                            //------ Fin - 23-01-2020: JSalazar. Cambios para incorporar funcionalidad de redondeo de eArciba en retenciones de SUSS --------//

                                                                            objSUSS.condicionID = "";
                                                                            objSUSS.alicuota = alicuota;
                                                                            objSUSS.certExencion = "";
                                                                            objSUSS.tipoExencion = "";
                                                                            objSUSS.fcaducidadExencion = "";
                                                                            objSUSS.numerador_cod = "num_ret_suss";

                                                                            if (!isNaN(objSUSS.imp_retencion) && !isNaN(objSUSS.base_calculo) && parseFloat(objSUSS.imp_retencion, 10) > 0.00 && parseFloat(objSUSS.base_calculo, 10) > 0.00) {
                                                                                respuestaRetenciones.retencion_suss.push(objSUSS);
                                                                                retencionOk = true;
                                                                            }
                                                                        }

                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - imp_retencion_suss: " + imp_retencion_suss + " - retencion_suss[i].importe_retencion: " + retencion_suss[i].importe_retencion + " - tasa_cambio_pago: " + tasa_cambio_pago);

                                                                        if (retencionOk) {
                                                                            // imp_retencion_suss = parseFloat(parseFloat(imp_retencion_suss, 10) + parseFloat(parseFloat(retencion_suss[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10), 10).toFixedOK(2);
                                                                            imp_retencion_suss = parseFloat(parseFloat(imp_retencion_suss, 10) + parseFloat(objSUSS.imp_retencion, 10), 10);
                                                                            // total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(parseFloat(retencion_suss[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10), 10).toFixedOK(2);
                                                                            total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(objSUSS.imp_retencion, 10), 10);
                                                                        }
                                                                    }

                                                                }

                                                                //nlapiSetFieldValue("custbody_l54_suss_imp_a_retener", imp_retencion_suss, false);
                                                                respuestaRetenciones.imp_retencion_suss = imp_retencion_suss;
                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - respuestaRetenciones.retencion_suss: " + JSON.stringify(respuestaRetenciones.retencion_suss) + " ** TIEMPO" + new Date());

                                                            }
                                                        }//FIN 2do if (esAgenteRetencionSUSS)

                                                        log.audit("Governance Monitoring", "LINE 1110 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        if (esAgenteRetencionIVA) {

                                                            if (estaInscriptoRegimenIVA) {

                                                                for (var i = 0; retencion_iva != null && i < retencion_iva.length; i++) {

                                                                    if ((parseFloat(retencion_iva[i].importe_retencion, 10) > 0.00) && (parseFloat(retencion_iva[i].base_calculo_retencion, 10) > 0.00)) {

                                                                        var informacionRetencion = null;
                                                                        var retencionOk = false;
                                                                        var objIVA = new Object();

                                                                        var resultInfRetencion = paramRetenciones.filter(function (obj) {
                                                                            return (obj.codigo == retencion_iva[i].codigo && obj.tipoContIVA.split(",").includes(tipoContribuyenteIVA));
                                                                        });

                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - resultInfRetencion: " + JSON.stringify(resultInfRetencion) + " ** TIEMPO" + new Date());

                                                                        if (!isEmpty(resultInfRetencion) && resultInfRetencion.length > 0) {
                                                                            //var informacionRetencion = resultInfRetencion[0].tipo_ret;
                                                                            var informacionRetencion = new Object();
                                                                            informacionRetencion.codigo = resultInfRetencion[0].codRetencion;
                                                                            informacionRetencion.tipo = resultInfRetencion[0].tipo_ret;
                                                                            informacionRetencion.descripcion = resultInfRetencion[0].desRetencion;
                                                                        }

                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - informacionRetencion: " + JSON.stringify(informacionRetencion) + " ** TIEMPO" + new Date());

                                                                        //informacionRetencion = getInformacionRetencion(retencion_iva[i].codigo);
                                                                        if (informacionRetencion != null) {

                                                                            objIVA.retencion = informacionRetencion.tipo;
                                                                            objIVA.tipo_ret = retencion_iva[i].codigo;
                                                                            objIVA.jurisdiccion = "";
                                                                            //objIVA.condicion = condicion_iva;
                                                                            objIVA.condicion = condicionesRetencion.codRetIVA;
                                                                            objIVA.neto_bill = parseFloat(numberTruncTwoDec(parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            objIVA.base_calculo = parseFloat(numberTruncTwoDec(parseFloat(retencion_iva[i].base_calculo_retencion, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            objIVA.base_calculo_imp = parseFloat(numberTruncTwoDec(parseFloat(retencion_iva[i].base_calculo_retencion_impresion, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            // objIVA.imp_retencion = parseFloat(parseFloat(retencion_iva[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10).toFixedOK(2);

                                                                            //------ Inicio - 23-01-2020: JSalazar. Cambios para incorporar funcionalidad de redondeo de eArciba en retenciones de IVA --------//
                                                                            var cantDecImpRetCodigoRet = countDecimales(parseFloat(retencion_iva[i].importe_retencion, 10));
                                                                            var cantDecTasaCambioPago = countDecimales(parseFloat(tasa_cambio_pago, 10));
                                                                            var cantDecTotalImpRetAux = cantDecImpRetCodigoRet - cantDecTasaCambioPago;
                                                                            log.audit("l54 - calculo retenciones", "LINE 2348 - Retención IVA - retencion_iva[i].importe_retencion: " + retencion_iva[i].importe_retencion + " --- tasa_cambio_pago: " + tasa_cambio_pago + " --- ÍNDICE i: " + i);
                                                                            var imp_retencion_aux = Math.abs(parseFloat(parseFloat(convertToInteger(retencion_iva[i].importe_retencion), 10) / parseFloat(convertToInteger(tasa_cambio_pago), 10), 10));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2350 - Retención IVA - convertToInteger(tasa_cambio_pago): " + convertToInteger(tasa_cambio_pago) + ", convertToInteger(retencion_iva[i].importe_retencion)" + convertToInteger(retencion_iva[i].importe_retencion));
                                                                            var cantDecImpRetAux = countDecimales(parseFloat(imp_retencion_aux, 10));
                                                                            var cantDecImpRetFinal = cantDecImpRetAux + cantDecTotalImpRetAux;
                                                                            var imp_retencion = Math.abs(parseFloat(parseFloat(convertToInteger(imp_retencion_aux), 10) / Math.pow(10, cantDecImpRetFinal), 10));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2354 - Retención IVA - imp_retencion_aux: " + imp_retencion_aux + ", cantDecImpRetCodigoRet: " + cantDecImpRetCodigoRet + ", cantDecTasaCambioPago: " + cantDecTasaCambioPago + ", cantDecTotalImpRetAux: " + cantDecTotalImpRetAux + ", cantDecImpRetAux: " + cantDecImpRetAux + ", cantDecImpRetFinal: " + cantDecImpRetFinal + ", imp_retencion: " + imp_retencion);
                                                                            var monto_suj_ret_moneda_local = 0.0;
                                                                            var alicuota = parseFloat(retencion_iva[i].alicuota, 10);
                                                                            var cantDecPorcentFinal = 0; // porcentajeFinal
                                                                            var cantDecImporteRetencion = 0; // importeNetoCalculadoRedondeado
                                                                            var cantDecTipoCambio = 0;
                                                                            var cantDecMontoImpRetMonedaLocal = 0;

                                                                            objIVA.imp_retencion = parseFloat(numberTruncTwoDec(imp_retencion), 10); // redondeado a 2 decimales para abajo o truncado a 2 decimales
                                                                            cantDecImporteRetencion = countDecimales(objIVA.imp_retencion);
                                                                            cantDecTipoCambio = countDecimales(tasa_cambio_pago);
                                                                            cantDecPorcentFinal = countDecimales(alicuota);
                                                                            cantDecMontoImpRetMonedaLocal = cantDecTipoCambio + cantDecImporteRetencion - cantDecPorcentFinal;
                                                                            monto_suj_ret_moneda_local = Math.abs(parseFloat(parseFloat((parseFloat((parseFloat(parseFloat(convertToInteger(objIVA.imp_retencion), 10) * parseFloat(convertToInteger(tasa_cambio_pago), 10) * 100, 10) / parseFloat(convertToInteger(alicuota), 10)), 10) / Math.pow(10, cantDecMontoImpRetMonedaLocal)), 10), 10));
                                                                            objIVA.monto_suj_ret_moneda_local = parseFloat(numberTruncTwoDec(monto_suj_ret_moneda_local), 10); // L54 - Monto Sujeto Retención (Moneda Local)
                                                                            objIVA.diferenciaRedondeo = parseFloat(numberToFixedDown(parseFloat(imp_retencion - objIVA.imp_retencion, 10), 12), 10);
                                                                            objIVA.base_calculo_original = objIVA.base_calculo;
                                                                            log.audit("l54 - calculo retenciones", "LINE 2371 - Retención IVA - imp_retencion cortado a 14 dígitos: " + imp_retencion.toString().substr(0, 14));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2372 - Retención IVA - imp_retencion: " + imp_retencion);
                                                                            objIVA.imp_retencion_original = imp_retencion.toString().substr(0, 14); // sin redondeos
                                                                            //------ Fin - 23-01-2020: JSalazar. Cambios para incorporar funcionalidad de redondeo de eArciba en retenciones de IVA --------//

                                                                            objIVA.condicionID = "";
                                                                            objIVA.alicuota = alicuota;
                                                                            objIVA.certExencion = "";
                                                                            objIVA.tipoExencion = "";
                                                                            objIVA.fcaducidadExencion = "";
                                                                            objIVA.numerador_cod = "num_ret_iva";

                                                                            if (!isNaN(objIVA.imp_retencion) && !isNaN(objIVA.base_calculo) && parseFloat(objIVA.imp_retencion, 10) > 0.00 && parseFloat(objIVA.base_calculo, 10) > 0.00) {
                                                                                respuestaRetenciones.retencion_iva.push(objIVA);
                                                                                retencionOk = true;
                                                                            }
                                                                        }

                                                                        if (retencionOk) {
                                                                            //imp_retencion_iva = parseFloat(parseFloat(imp_retencion_iva, 10) + parseFloat(parseFloat(retencion_iva[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10), 10).toFixedOK(2);
                                                                            // imp_retencion_iva = parseFloat(parseFloat(imp_retencion_iva, 10) + parseFloat(retencion_iva[i].importe_retencion, 10), 10).toFixedOK(2);
                                                                            imp_retencion_iva = parseFloat(parseFloat(imp_retencion_iva, 10) + parseFloat(objIVA.imp_retencion, 10), 10);
                                                                            //total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(parseFloat(retencion_iva[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10), 10).toFixedOK(2);
                                                                            // total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(retencion_iva[i].importe_retencion, 10), 10).toFixedOK(2);
                                                                            total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(objIVA.imp_retencion, 10), 10);
                                                                        }
                                                                    }
                                                                }

                                                                //nlapiSetFieldValue("custbody_l54_iva_imp_a_retener", imp_retencion_iva, false);
                                                                respuestaRetenciones.imp_retencion_iva = imp_retencion_iva;
                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - respuestaRetenciones.retencion_iva: " + JSON.stringify(respuestaRetenciones.retencion_iva) + " ** TIEMPO" + new Date());

                                                            }
                                                        }//FIN 2do if (esAgenteRetencionIVA) 

                                                        log.audit("Governance Monitoring", "LINE 2403 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        var jurisdiccionesSinParametrizacion = "";
                                                        var errorJurisdiccionInvalida = false;

                                                        if (esAgenteRetencionIIBB) {

                                                            if (estaInscriptoRegimenIIBB) {

                                                                for (var i = 0; codigosRetencionIIBB != null && codigosRetencionIIBB.infoRet != null && i < codigosRetencionIIBB.infoRet.length; i++) {

                                                                    if ((parseFloat(codigosRetencionIIBB.infoRet[i].importe_retencion, 10) > 0.00) || (parseFloat(codigosRetencionIIBB.infoRet[i].importe_retencion, 10) >= 0.00 && codigosRetencionIIBB.infoRet[i].jurisdiccionCodigo == 924) && (parseFloat(codigosRetencionIIBB.infoRet[i].base_calculo, 10) >= 0.00 && codigosRetencionIIBB.infoRet[i].jurisdiccionCodigo == 924)) {

                                                                        var informacionRetencion = null;
                                                                        var retencionOk = false;
                                                                        var objIIBB = new Object();

                                                                        var resultInfRetencion = paramRetenciones.filter(function (obj) {
                                                                            return (obj.codigo == codigosRetencionIIBB.infoRet[i].codigo);
                                                                        });

                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - resultInfRetencion: " + JSON.stringify(resultInfRetencion) + " ** TIEMPO" + new Date());

                                                                        if (!isEmpty(resultInfRetencion) && resultInfRetencion.length > 0) {
                                                                            //var informacionRetencion = resultInfRetencion[0].tipo_ret;
                                                                            var informacionRetencion = new Object();
                                                                            informacionRetencion.codigo = resultInfRetencion[0].codRetencion;
                                                                            informacionRetencion.tipo = resultInfRetencion[0].tipo_ret;
                                                                            informacionRetencion.descripcion = resultInfRetencion[0].desRetencion;
                                                                        }

                                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - informacionRetencion: " + JSON.stringify(informacionRetencion) + " ** TIEMPO" + new Date());

                                                                        //informacionRetencion = getInformacionRetencion(codigosRetencionIIBB.infoRet[i].codigo);
                                                                        if (informacionRetencion != null) {

                                                                            objIIBB.retencion = informacionRetencion.tipo;
                                                                            objIIBB.tipo_ret = codigosRetencionIIBB.infoRet[i].codigo;
                                                                            objIIBB.jurisdiccion = codigosRetencionIIBB.infoRet[i].jurisdiccion;
                                                                            objIIBB.condicion = codigosRetencionIIBB.infoRet[i].condicion;
                                                                            //objIIBB.neto_bill = parseFloat(parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10) / parseFloat(tasa_cambio_pago, 10), 10).toFixedOK(2);
                                                                            objIIBB.neto_bill = parseFloat(numberTruncTwoDec(parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            //objIIBB.neto_bill = parseFloat(numberTruncTwoDec(parseFloat(codigosRetencionIIBB.infoRet[i].base_calculo_retencion, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            objIIBB.base_calculo = parseFloat(numberTruncTwoDec(parseFloat(codigosRetencionIIBB.infoRet[i].base_calculo_retencion, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            objIIBB.base_calculo_imp = parseFloat(numberTruncTwoDec(parseFloat(codigosRetencionIIBB.infoRet[i].base_calculo_retencion_impresion, 10) / parseFloat(tasa_cambio_pago, 10)), 10);
                                                                            //objIIBB.imp_retencion = parseFloat(parseFloat(codigosRetencionIIBB.infoRet[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10).toFixedOK(2);

                                                                            //------ Inicio - 29-08-2019: JSalazar. Cambios para txt eArciba ----------------***
                                                                            var cantDecImpRetCodigoRet = countDecimales(parseFloat(codigosRetencionIIBB.infoRet[i].importe_retencion, 10));
                                                                            var cantDecTasaCambioPago = countDecimales(parseFloat(tasa_cambio_pago, 10));
                                                                            var cantDecTotalImpRetAux = cantDecImpRetCodigoRet - cantDecTasaCambioPago;
                                                                            log.audit("l54 - calculo retenciones", "LINE 2448 - codigosRetencionIIBB.infoRet[i].importe_retencion: " + codigosRetencionIIBB.infoRet[i].importe_retencion + " --- tasa_cambio_pago: " + tasa_cambio_pago);
                                                                            var imp_retencion_aux = Math.abs(parseFloat(parseFloat(convertToInteger(codigosRetencionIIBB.infoRet[i].importe_retencion), 10) / parseFloat(convertToInteger(tasa_cambio_pago), 10), 10));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2450 - convertToInteger(tasa_cambio_pago): " + convertToInteger(tasa_cambio_pago) + ", convertToInteger(codigosRetencionIIBB.infoRet[i].importe_retencion)" + convertToInteger(codigosRetencionIIBB.infoRet[i].importe_retencion));
                                                                            var cantDecImpRetAux = countDecimales(parseFloat(imp_retencion_aux, 10));
                                                                            var cantDecImpRetFinal = cantDecImpRetAux + cantDecTotalImpRetAux;
                                                                            var imp_retencion = Math.abs(parseFloat(parseFloat(convertToInteger(imp_retencion_aux), 10) / Math.pow(10, cantDecImpRetFinal), 10));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2454 - imp_retencion_aux: " + imp_retencion_aux + ", cantDecImpRetCodigoRet: " + cantDecImpRetCodigoRet + ", cantDecTasaCambioPago: " + cantDecTasaCambioPago + ", cantDecTotalImpRetAux: " + cantDecTotalImpRetAux + ", cantDecImpRetAux: " + cantDecImpRetAux + ", cantDecImpRetFinal: " + cantDecImpRetFinal + ", imp_retencion: " + imp_retencion);
                                                                            var monto_suj_ret_moneda_local = 0.0;
                                                                            var alicuota = parseFloat(codigosRetencionIIBB.infoRet[i].alicuota, 10);
                                                                            var cantDecPorcentFinal = 0; // porcentajeFinal
                                                                            var cantDecImporteRetencion = 0; // importeNetoCalculadoRedondeado
                                                                            var cantDecTipoCambio = 0;
                                                                            var cantDecMontoImpRetMonedaLocal = 0;

                                                                            objIIBB.imp_retencion = parseFloat(numberTruncTwoDec(imp_retencion), 10); // redondeado a 2 decimales para abajo o truncado a 2 decimales
                                                                            cantDecImporteRetencion = countDecimales(objIIBB.imp_retencion);
                                                                            cantDecTipoCambio = countDecimales(tasa_cambio_pago);
                                                                            cantDecPorcentFinal = countDecimales(alicuota);
                                                                            cantDecMontoImpRetMonedaLocal = cantDecTipoCambio + cantDecImporteRetencion - cantDecPorcentFinal;
                                                                            monto_suj_ret_moneda_local = Math.abs(parseFloat(parseFloat((parseFloat((parseFloat(parseFloat(convertToInteger(objIIBB.imp_retencion), 10) * parseFloat(convertToInteger(tasa_cambio_pago), 10) * 100, 10) / parseFloat(convertToInteger(alicuota), 10)), 10) / Math.pow(10, cantDecMontoImpRetMonedaLocal)), 10), 10));
                                                                            objIIBB.monto_suj_ret_moneda_local = parseFloat(numberTruncTwoDec(monto_suj_ret_moneda_local), 10); // L54 - Monto Sujeto Retención (Moneda Local)
                                                                            objIIBB.diferenciaRedondeo = parseFloat(numberToFixedDown(parseFloat(imp_retencion - objIIBB.imp_retencion, 10), 12), 10);
                                                                            objIIBB.base_calculo_original = objIIBB.base_calculo;

                                                                            log.audit("l54 - calculo retenciones", "LINE 2481 - imp_retencion cortado a 14 dígitos: " + imp_retencion.toString().substr(0, 14));
                                                                            log.audit("l54 - calculo retenciones", "LINE 2482 - imp_retencion: " + imp_retencion);
                                                                            objIIBB.imp_retencion_original = imp_retencion.toString().substr(0, 14); // sin redondeos
                                                                            objIIBB.condicionID = codigosRetencionIIBB.infoRet[i].condicionID;
                                                                            //objIIBB.alicuota=codigosRetencionIIBB.infoRet[i].porcentajeRetencion;
                                                                            //objIIBB.alicuota=parseFloat(codigosRetencionIIBB.infoRet[i].alicuota, 10).toFixedOK(2);
                                                                            objIIBB.alicuota = alicuota;
                                                                            objIIBB.certExencion = codigosRetencionIIBB.infoRet[i].certExencion;
                                                                            objIIBB.tipoExencion = codigosRetencionIIBB.infoRet[i].tipoExencion;
                                                                            objIIBB.fcaducidadExencion = codigosRetencionIIBB.infoRet[i].fcaducidadExencion;
                                                                            objIIBB.numerador_cod = "num_ret_iibb";

                                                                            if (!isNaN(objIIBB.imp_retencion) && !isNaN(objIIBB.base_calculo) && parseFloat(objIIBB.imp_retencion, 10) > 0.00 && parseFloat(objIIBB.base_calculo, 10) > 0.00) {
                                                                                respuestaRetenciones.retencion_iibb.push(objIIBB);
                                                                                retencionOk = true;
                                                                            }
                                                                        } else {
                                                                            errorJurisdiccionInvalida = true;
                                                                            jurisdiccionesSinParametrizacion += isEmpty(jurisdiccionesSinParametrizacion) ? codigosRetencionIIBB.infoRet[i].jurisdiccionTexto : ", " + codigosRetencionIIBB.infoRet[i].jurisdiccionTexto;
                                                                        }

                                                                        if (retencionOk) {
                                                                            // imp_retencion_iibb = parseFloat(parseFloat(imp_retencion_iibb, 10) + parseFloat(parseFloat(codigosRetencionIIBB.infoRet[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10), 10).toFixedOK(2);
                                                                            imp_retencion_iibb = parseFloat(parseFloat(imp_retencion_iibb, 10) + parseFloat(objIIBB.imp_retencion, 10), 10);
                                                                            // total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(parseFloat(codigosRetencionIIBB.infoRet[i].importe_retencion, 10) / parseFloat(tasa_cambio_pago, 10), 10), 10).toFixedOK(2);
                                                                            total_retenciones = parseFloat(parseFloat(total_retenciones, 10) + parseFloat(objIIBB.imp_retencion, 10), 10);
                                                                        }
                                                                    }
                                                                }

                                                                if (errorJurisdiccionInvalida) {
                                                                    respuestaRetenciones.warning = true;
                                                                    respuestaRetenciones.mensajeWarning.push("Las retenciones de IIBB de las jurisdicciones: " + jurisdiccionesSinParametrizacion + " no serán calculadas porque no pertenecen a los Códigos de Retención de la " + datoCuenta + ".");
                                                                }

                                                                //nlapiSetFieldValue("custbody_l54_iibb_imp_a_retener", imp_retencion_iibb, false);
                                                                respuestaRetenciones.imp_retencion_iibb = imp_retencion_iibb;
                                                                log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - respuestaRetenciones.retencion_iibb: " + JSON.stringify(respuestaRetenciones.retencion_iibb) + " ** TIEMPO" + new Date());

                                                            }
                                                        }//FIN 2do if (esAgenteRetencionIIBB)    

                                                        log.audit("Governance Monitoring", "LINE 1282 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                                                        respuestaRetenciones.importe_neto_a_abonar = parseFloat(parseFloat(total, 10) - parseFloat(total_retenciones, 10)).toFixedOK(2);
                                                        if (isNaN(respuestaRetenciones.importe_neto_a_abonar)) {
                                                            respuestaRetenciones.importe_neto_a_abonar = 0.00;
                                                        }

                                                        respuestaRetenciones.neto_bill_aplicados = parseFloat(parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10) / parseFloat(tasa_cambio_pago, 10), 10).toFixedOK(2);
                                                        if (isNaN(respuestaRetenciones.neto_bill_aplicados)) {
                                                            respuestaRetenciones.neto_bill_aplicados = 0.00;
                                                        }

                                                        respuestaRetenciones.importe_total_retencion = parseFloat(total_retenciones, 10).toFixedOK(2);
                                                        if (isNaN(respuestaRetenciones.importe_total_retencion)) {
                                                            respuestaRetenciones.importe_total_retencion = 0.00;
                                                        }

                                                        if ((!isEmpty(importeIVAPago) && !isNaN(importeIVAPago) && parseFloat(importeIVAPago, 10) < 0.00) || (isEmpty(importeIVAPago)) || (isNaN(importeIVAPago))) {
                                                            importeIVAPago = 0.00;
                                                        }

                                                        if ((!isEmpty(importePercepcionesPago) && !isNaN(importePercepcionesPago) && parseFloat(importePercepcionesPago, 10) < 0.00) || isEmpty(importePercepcionesPago) || (isNaN(importeIVAPago))) {
                                                            importePercepcionesPago = 0.00;
                                                        }

                                                        respuestaRetenciones.importe_iva = parseFloat(importeIVAPago, 10).toFixedOK(2);
                                                        if (isNaN(respuestaRetenciones.importe_iva)) {
                                                            respuestaRetenciones.importe_iva = 0.00;
                                                        }

                                                        respuestaRetenciones.importe_percepciones = parseFloat(importePercepcionesPago, 10).toFixedOK(2);
                                                        if (isNaN(respuestaRetenciones.importe_percepciones)) {
                                                            respuestaRetenciones.importe_percepciones = 0.00;
                                                        }

                                                        // Guardo la Fecha de la Version para saber a que funcion de Imprimir PDF de Retenciones Utilizar
                                                        // si el Pago a Proveedor no tiene configurado este campo con la fecha o es otra fecha no es esta version

                                                        respuestaRetenciones.version_calc_ret = "2018.1";

                                                        /*var context = nlapiGetContext();
                                                        var unidadesDisponibles = context.getRemainingUsage();
                                                        alert("Unidades Disponibles : " + unidadesDisponibles);*/

                                                        log.audit("Governance Monitoring", "LINE 1306 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                                                        log.debug("L54 - Calculo Retenciones", "CALCULARETENCIONES - respuestaRetenciones: " + JSON.stringify(respuestaRetenciones) + " ** TIEMPO" + new Date());

                                                    } else {
                                                        errorGeneral = true;
                                                        respuestaRetenciones.error = true;
                                                        respuestaRetenciones.mensajeError.push("codigosRetencionIIBB=" + codigosRetencionIIBB.mensaje);
                                                    }//FIN if (calcularRetIIBB == false || (calcularRetIIBB == true && codigosRetencionIIBB != null && codigosRetencionIIBB.error == false))

                                                } else {
                                                    errorGeneral = true;
                                                    respuestaRetenciones.error = true;
                                                    respuestaRetenciones.errorFacturaM = true;
                                                    respuestaRetenciones.mensajeError.push("Solo es Posible realizar Pagos Totales de Facturas M");
                                                }//if(pagoTotalFacturasM==true)

                                            }//FIN if (errorGeneral == false)
                                            if (errorGeneral == false) {
                                                //alert("El proceso de cálculo de retenciones finalizo exitosamente.");
                                                respuestaRetenciones.error = false;
                                                respuestaRetenciones.mensajeJurisdiccion = mensajeJurisdiccionesNotValid;
                                                respuestaRetenciones.mensajeOk = "El proceso de cálculo de retenciones finalizó exitosamente.";
                                                if (respuestaRetenciones.mensajeJurisdiccion != "") {
                                                    respuestaRetenciones.mensajeJurisdiccion = "NOTA: Las facturas con los Nro.º de Referencia: " + respuestaRetenciones.mensajeJurisdiccion + "; no se les calculó retenciones porque poseen una Jurisdicción Única no configurada en el Proveedor ni en IIBB Configuración General. \n";
                                                    respuestaRetenciones.mensajeOk += "\n" + respuestaRetenciones.mensajeJurisdiccion;
                                                }
                                            }

                                        } else {
                                            //alert("No se Encuentra configurado el Estado exento para IIBB en la Información Impositiva de la Empresa.");
                                            respuestaRetenciones.error = true;
                                            respuestaRetenciones.mensajeError.push("No se Encuentra configurado el Estado exento para IIBB en la Información Impositiva de la Empresa.");
                                        }
                                    } else {
                                        alert("No se Encuentra configurado el Estado exento para IVA en la Información Impositiva de la Empresa.");
                                        respuestaRetenciones.error = true;
                                        respuestaRetenciones.mensajeError.push("No se Encuentra configurado el Estado exento para IVA en la Información Impositiva de la Empresa.");
                                    }
                                } else {
                                    //alert("No se Encuentra configurado el Estado exento para SUSS en la Información Impositiva de la Empresa.");
                                    respuestaRetenciones.error = true;
                                    respuestaRetenciones.mensajeError.push("No se Encuentra configurado el Estado exento para SUSS en la Información Impositiva de la Empresa.");
                                }
                            } else {
                                alert("No se Encuentra configurado el Estado exento para GANANCIAS en la Información Impositiva de la Empresa.");
                                respuestaRetenciones.error = true;
                                respuestaRetenciones.mensajeError.push("No se Encuentra configurado el Estado exento para GANANCIAS en la Información Impositiva de la Empresa.");
                            }
                        } else {
                            if (validacionCalculoRet == null) {
                                // Error Generico
                                respuestaRetenciones.error = true;
                                respuestaRetenciones.mensajeError.push("Error Validando Informacion del Pago");
                            } else {
                                // grabo validacionCalculoRet.mensaje
                                respuestaRetenciones.error = true;
                                respuestaRetenciones.mensajeError.push("validacionCalculoRet=" + validacionCalculoRet.mensaje);
                            }
                        }
                    } else {
                        // Error Obteniendo Informacion del Pago
                        respuestaRetenciones.error = true;
                        respuestaRetenciones.mensajeError.push("Error Al Obtener la Informacion del Pago");
                    }
                } else {
                    // Error Obteniendo Informacion del Pago
                    respuestaRetenciones.error = true;
                    respuestaRetenciones.mensajeError.push("Error Al Entrar al Suitelet, No es por Método POST");
                }
            } catch (e) {
                respuestaRetenciones.error = true;
                respuestaRetenciones.mensajeError.push("Excepción Error - Cálculo de Retenciones. Excepción: " + e.message);
                log.error("L54 - Calculo Retenciones", "CALCULARETENCIONES - Excepción Calcula Retenciones. Excepción: " + JSON.stringify(e));
            }

            //Genero en una lista concatenada los 4:
            respuestaRetenciones.listaRetenciones = new Array();
            respuestaRetenciones.listaRetenciones = respuestaRetenciones.listaRetenciones.concat(respuestaRetenciones.retencion_ganancias);
            respuestaRetenciones.listaRetenciones = respuestaRetenciones.listaRetenciones.concat(respuestaRetenciones.retencion_suss);
            respuestaRetenciones.listaRetenciones = respuestaRetenciones.listaRetenciones.concat(respuestaRetenciones.retencion_iva);
            respuestaRetenciones.listaRetenciones = respuestaRetenciones.listaRetenciones.concat(respuestaRetenciones.retencion_iibb);

            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Respuesta : " + JSON.stringify(respuestaRetenciones) + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Error : " + respuestaRetenciones.error + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - ErrorFacturaM : " + respuestaRetenciones.errorFacturaM + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Warning : " + respuestaRetenciones.warning);
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Mensaje Error : " + respuestaRetenciones.mensajeError + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Mensaje Warning : " + respuestaRetenciones.mensajeWarning + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Mensaje OK : " + respuestaRetenciones.mensajeOk + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Cantidad Retenciones GANANCIAS : " + respuestaRetenciones.retencion_ganancias.length + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Cantidad Retenciones SUSS : " + respuestaRetenciones.retencion_suss.length + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Cantidad Retenciones IVA : " + respuestaRetenciones.retencion_iva.length + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Cantidad Retenciones IIBB : " + respuestaRetenciones.retencion_iibb.length + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Importe Total Retenciones : " + respuestaRetenciones.total_retenciones + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Importe Retencion GANANCIAS : " + respuestaRetenciones.imp_retencion_ganancias + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Importe Retencion SUSS : " + respuestaRetenciones.imp_retencion_suss + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Importe Retencion IVA : " + respuestaRetenciones.imp_retencion_iva + " ** TIEMPO" + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES - Importe Retencion IIBB : " + respuestaRetenciones.imp_retencion_iibb + " ** TIEMPO" + new Date());

            //var respuestaRetencionesJSON = JSON.stringify(respuestaRetenciones);
            var respuestaRetencionesJSON = respuestaRetenciones;
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES FIN - Tiempo: " + new Date());
            log.audit("L54 - Calculo Retenciones", "CALCULARETENCIONES FIN - respuestaRetencionesJSON: " + JSON.stringify(respuestaRetencionesJSON) + " ** TIEMPO" + new Date());
            log.audit("Governance Monitoring", "LINE 1406 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

            var responseSuitelet = context.response;
            var informacionRespuestaJSON = [];
            informacionRespuestaJSON.push(respuestaRetencionesJSON);
            log.debug(proceso, "informacionRespuestaJSON: " + JSON.stringify(informacionRespuestaJSON));
            responseSuitelet.write({ output: JSON.stringify(informacionRespuestaJSON) });
        }

        function validarRetJurisdiccion(arrayRetencionesGeneradas, jurisdiccion) {

            var proceso = "validarRetJurisdiccion";
            var respuesta = { error: false, mensaje: "", existenRetenciones: false };

            log.debug(proceso, "INICIO - validarPercJurisdiccion / jurisdiccion: " + jurisdiccion);

            try {
                if (arrayRetencionesGeneradas.length > 0) {
                    var result = arrayRetencionesGeneradas.filter(function (obj) {
                        return (obj.jurisdiccion === jurisdiccion);
                    });

                    if (!isEmpty(result) && result.length > 0) {
                        respuesta.existenRetenciones = true;
                    }
                }
            } catch (error) {
                respuesta.error = true;
                respuesta.mensaje = "Error excepcion al validar si existe transacciones con retenciones a procesar - detalles: " + error.message;
                log.error(proceso, respuesta.mensaje);
            }

            log.debug(proceso, "FIN - validarPercJurisdiccion / respuesta: " + JSON.stringify(respuesta));

            return respuesta;
        }

        function obtenerJurisAcumuladas(infoRetenciones) {

            var respuesta = { error: false, mensaje: "", jurisdAcumuladas: [], existeRetSobreNeto: false, existeRetSobreBruto: false };
            log.debug("obtenerJurisAcumuladas", "INICIO - obtenerJurisAcumuladas - cantidad jurisdicciones: " + infoRetenciones.length);

            try {
                if (!isEmpty(infoRetenciones) && infoRetenciones.length > 0) {
                    for (var i = 0; i < infoRetenciones.length; i++) {
                        // Se validan las jurisdicciones acumuladas de las que aplican a retenciones
                        if (!isEmpty(infoRetenciones[i].baseCalcAcumulada) && infoRetenciones[i].baseCalcAcumulada) {
                            respuesta.jurisdAcumuladas.push(infoRetenciones[i].jurisdiccion);
                        }

                        // Se valida si alguna aplica a calculo sobre el bruto o sobre el neto.
                        if (!isEmpty(infoRetenciones[i].calcularSobreBruto) && infoRetenciones[i].calcularSobreBruto) {
                            respuesta.existeRetSobreBruto = true;
                        } else {
                            respuesta.existeRetSobreNeto = true;
                        }
                    }
                }
            } catch (error) {
                respuesta.error = true;
                respuesta.mensaje = "Error excepcion al obtener la jurisdiccion acumulada del proveedor - detalles: " + error.message;
                log.error("obtenerJurisAcumuladas", respuesta.mensaje);
            }

            log.debug("obtenerJurisAcumuladas", "FIN - obtenerJurisAcumuladas / respuesta: " + JSON.stringify(respuesta));

            return respuesta;
        }

        function obtenerFactPagasPeriodoIIBB(entidad, periodo, subsidiaria) {

            var proceso = "obtenerFactPagasPeriodoIIBB";
            var respuesta = { error: false, mensaje: "", importeTotalNetoAcum: 0.0, importeTotalBrutoAcum: 0.0 };
            log.debug(proceso, "INICIO - obtenerFactPagasPeriodoIIBB / entidad: " + entidad + " / periodo: " + periodo + " / subsidiaria: " + subsidiaria);

            try {
                /* Filtros */
                var filtros = [];
                if (!isEmpty(entidad)) {
                    var filtro = {};
                    filtro.name = "entity";
                    filtro.operator = "ANYOF";
                    filtro.values = entidad;
                    filtros.push(filtro);
                }

                if (!isEmpty(subsidiaria)) {
                    var filtro1 = {};
                    filtro1.name = "subsidiary";
                    filtro1.operator = "ANYOF";
                    filtro1.values = subsidiaria;
                    filtros.push(filtro1);
                }

                if (!isEmpty(periodo)) {
                    var filtro2 = {};
                    filtro2.name = "postingperiod";
                    filtro2.operator = "IS";
                    filtro2.values = periodo;
                    filtros.push(filtro2);
                }

                var objResultSet = utilidades.searchSavedPro("customsearch_l54_fac_pag_per_iibb_cal_re", filtros);

                if (objResultSet.error) {
                    log.error(proceso, "Error en consulta de SS ***Script / L54 - Facturas Pagadas Período IIBB (Cálculo Retenciones)");
                    return respuesta;
                }

                var resultSet = objResultSet.objRsponseFunction.result;
                var resultSearch = objResultSet.objRsponseFunction.search;

                if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                    for (var i = 0; i < resultSet.length; i++) {
                        respuesta.importeTotalBrutoAcum = resultSet[i].getValue({ name: resultSearch.columns[5] });
                        respuesta.importeTotalNetoAcum = resultSet[i].getValue({ name: resultSearch.columns[6] });
                    }
                } else {
                    respuesta.error = true;
                    respuesta.mensaje = "No se encontró ningún resultado de transaccion para los filtros ingresados para obtener las facturas pagadas en el mes";
                    log.error(proceso, respuesta.mensaje);
                }
            } catch (error) {
                respuesta.error = true;
                respuesta.mensaje = "Error excepcion al obtener todas las transacciones del proveedor pagadas en el periodo del pago actual - detalles: " + error.message;
                log.error(proceso, respuesta.mensaje);
            }

            log.debug(proceso, "FIN - obtenerFactPagasPeriodoIIBB / respuesta: " + JSON.stringify(respuesta));

            return respuesta;
        }
        function getInfoRetencionCalcAnteriores(id_proveedor, id_periodo, codigo_retencion, subsidiaria, esAnualizada, fecha_pago, pagos) {

            try {

                log.debug('getInfoRetencionCalcAnteriores', 'INICIO - getInfoRetencionCalcAnteriores');
                log.debug('getInfoRetencionCalcAnteriores', 'Parámetros - id_proveedor: ' + id_proveedor + ' - id_periodo: ' + id_periodo + ' - codigo_retencion: ' + JSON.stringify(codigo_retencion) + ' - subsidiaria: ' + subsidiaria + ' - esAnualizada: ' + esAnualizada + ' - fecha_pago: ' + fecha_pago);

                var informacionRetencionesPasadas = [];
                var filtros = [];
                var filtro = {};

                if (!utilidades.isEmpty(codigo_retencion) && codigo_retencion.length > 0) {

                    //FILTRO PROVEEDOR
                    if (!utilidades.isEmpty(id_proveedor)) {
                        var filtro = {};
                        filtro.name = 'custrecord_l54_ret_ref_proveedor';
                        filtro.operator = 'IS';
                        filtro.values = id_proveedor;
                        filtros.push(filtro);
                    }

                    //FILTRO PERIODO DE ACUERDO A SI ES ANUALIZADO O NO.
                    if (esAnualizada) {
                        /* var trandateDate = format.parse({
                            value: fecha_pago,
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_BUENOS_AIRES // Montevideo - Uruguay
                        }); */

                        var trandateDate = fecha_pago;

                        var dia = trandateDate.getDate();
                        var mes = trandateDate.getMonth();
                        var anio = trandateDate.getFullYear();
                        var trandateDate = new Date(anio, mes, dia);

                        // Busco los Pagos Anteriores de Monotributo de la Misma Moneda
                        var fechaInicial = new Date(anio, mes, dia); // ver de poner la fecha actual o la fecha de la transacción
                        fechaInicial.setDate(1);
                        //fechaInicial.setMonth(fechaInicial.getMonth() - 11);
                        fechaInicial.setMonth(0);

                        var fechaFinal = new Date(anio, mes, dia);

                        var fechaInicialAUX = format.format({
                            value: fechaInicial,
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_BUENOS_AIRES
                        });

                        var fechaFinalAUX = format.format({
                            value: fechaFinal,
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_BUENOS_AIRES
                        });

                        //FILTRO FECHA DESDE
                        if (!utilidades.isEmpty(fechaInicialAUX)) {
                            var filtro = {};
                            filtro.name = 'custrecord_l54_ret_fecha';
                            filtro.operator = 'ONORAFTER';
                            filtro.values = fechaInicialAUX;
                            filtros.push(filtro);
                        }

                        //FILTRO FECHA HASTA
                        if (!utilidades.isEmpty(fechaFinalAUX)) {
                            var filtro = {};
                            filtro.name = 'custrecord_l54_ret_fecha';
                            filtro.operator = 'ONORBEFORE';
                            filtro.values = fechaFinalAUX;
                            filtros.push(filtro);
                        }
                    } else {
                        if (!utilidades.isEmpty(id_periodo)) {
                            var filtro = {};
                            filtro.name = 'custrecord_l54_ret_periodo';
                            filtro.operator = 'IS';
                            filtro.values = id_periodo;
                            filtros.push(filtro);
                        }
                    }

                    //FILTRO SUBSIDIARIA
                    if (!utilidades.isEmpty(subsidiaria)) {
                        var filtro = {};
                        filtro.name = 'custrecord_l54_ret_subsidiaria';
                        filtro.operator = 'IS';
                        filtro.values = subsidiaria;
                        filtros.push(filtro);
                    }

                    //FILTRO Pagos
                    if (!utilidades.isEmpty(pagos) && pagos.length > 0) {
                        var filtro = {};
                        filtro.name = 'custrecord_l54_ret_ref_pago_prov';
                        filtro.operator = 'ANYOF';
                        filtro.values = pagos[0].pagosAsociados;
                        filtros.push(filtro);
                    }

                    //FILTRO CODIGO RETENCION
                    var filtro = {};
                    filtro.name = 'custrecord_l54_ret_cod_retencion';
                    filtro.operator = 'ANYOF';
                    filtro.values = codigo_retencion;
                    filtros.push(filtro);

                    var objResultSet = utilidades.searchSavedPro('customsearch_l54_obtener_inf_ret_pasadas', filtros);

                    if (objResultSet.error) {
                        log.error('getInfoRetencionCalcAnteriores', 'Error Consultando searchSavedPro - getInfoRetencionCalcAnteriores - Error: ' + objResultSet.descripcion);
                        return null;
                    }

                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;
                    //log.debug(proceso, "SET: " + JSON.stringify(resultSet));
                    //log.debug(proceso, "SEARCH: " + JSON.stringify(resultSearch));

                    if ((!isEmpty(resultSet)) && (resultSet.length > 0)) {
                        for (var i = 0; i < resultSet.length; i++) {

                            informacionRetencionesPasadas[i] = {};

                            informacionRetencionesPasadas[i].codigoRetencion = resultSet[i].getValue({
                                name: resultSearch.columns[0]
                            });//CODIGO RETENCION

                            informacionRetencionesPasadas[i].referenciaProveedor = resultSet[i].getValue({
                                name: resultSearch.columns[1]
                            });//REFERENCIA PROVEEDOR

                            informacionRetencionesPasadas[i].importe = parseFloat(resultSet[i].getValue({
                                name: resultSearch.columns[2]
                            }), 10);//BASE CÁLCULO

                            informacionRetencionesPasadas[i].imp_retenido = parseFloat(resultSet[i].getValue({
                                name: resultSearch.columns[3]
                            }), 10);//IMPORTE RETENIDO

                            informacionRetencionesPasadas[i].idRetenciones = resultSet[i].getValue({
                                name: resultSearch.columns[4]
                            });//ID RETENCIONES
                        }
                    } else {
                        log.debug('getInfoRetencionCalcAnteriores', 'getInfoRetencionCalcAnteriores - No se encontró informacion de importe de pagos pasados para los parametros indicados');
                    }
                }

                log.debug('getInfoRetencionCalcAnteriores', 'RETURN - informacionRetencionesPasadas: ' + JSON.stringify(informacionRetencionesPasadas));
                log.debug('getInfoRetencionCalcAnteriores', 'FIN - getInfoRetencionCalcAnteriores');
                return informacionRetencionesPasadas;

            } catch (e) {
                log.error('getInfoRetencionCalcAnteriores', 'Error - getInfoRetencionCalcAnteriores - Excepcion Error: ' + e.message);
                return null;
            }
        }

        function obtenerRetenJurisdMens(entidad, periodo, subsidiaria, jurisdAcumuladas) {

            var proceso = "obtenerRetenJurisdMens";
            var respuesta = { error: false, mensaje: "", registros: [], existenRetParaTodasJurisd: false };

            try {
                log.debug(proceso, "INICIO - obtener Retencion Jurisdicciones / entidad: " + entidad + " / periodo: " + periodo + " / subsidiariaPago: " + subsidiaria + " / jurisdAcumuladas: " + JSON.stringify(jurisdAcumuladas));

                if (!isEmpty(jurisdAcumuladas) && jurisdAcumuladas.length > 0) {

                    /* Filtros */
                    var filtros = [];
                    if (!isEmpty(entidad)) {
                        var filtro = {};
                        filtro.name = "custrecord_l54_ret_ref_proveedor";
                        filtro.operator = "ANYOF";
                        filtro.values = entidad;
                        filtros.push(filtro);
                    }

                    if (!isEmpty(subsidiaria)) {
                        var filtro1 = {};
                        filtro1.name = "custrecord_l54_ret_subsidiaria";
                        filtro1.operator = "ANYOF";
                        filtro1.values = subsidiaria;
                        filtros.push(filtro1);
                    }

                    if (!isEmpty(periodo)) {
                        var filtro2 = {};
                        filtro2.name = "custrecord_l54_ret_periodo";
                        filtro2.operator = "IS";
                        filtro2.values = periodo;
                        filtros.push(filtro2);
                    }

                    var filtro3 = {};
                    filtro3.name = "custrecord_l54_ret_jurisdiccion";
                    filtro3.operator = "ANYOF";
                    filtro3.values = jurisdAcumuladas;
                    filtros.push(filtro3);

                    var objResultSet = utilidades.searchSavedPro("customsearch_l54_jurisd_retenc_periodos", filtros);

                    if (objResultSet.error) {
                        respuesta.error = true;
                        respuesta.mensaje = "Error en consulta de SS de ***Script / Jurisdicciones con retenciones por período";
                        log.error(proceso, respuesta.mensaje);
                        return respuesta;
                    }

                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;

                    if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                        for (var i = 0; i < resultSet.length; i++) {
                            var info = {};
                            info.nombreProveedor = resultSet[i].getValue({ name: resultSearch.columns[0] });
                            info.jurisdiccion = resultSet[i].getValue({ name: resultSearch.columns[1] });
                            respuesta.registros.push(info);
                        }

                        //Se validan si las jurisdicciones acumuladas poseen todas retenciones generadas para no calcular el importe neto acumulado y el bruto acumulado
                        var existenRetParaTodasJurisd = true;
                        for (var i = 0; i < jurisdAcumuladas.length && existenRetParaTodasJurisd; i++) {
                            var result = respuesta.registros.filter(function (obj) {
                                return (obj.jurisdiccion == jurisdAcumuladas[i]);
                            });

                            existenRetParaTodasJurisd = (!isEmpty(result) && result.length > 0) ? true : false;
                        }

                        respuesta.existenRetParaTodasJurisd = existenRetParaTodasJurisd;
                    } else {
                        log.error(proceso, "No se encontró ningún resultado de retención para los filtros ingresados para obtener las retenciones asociadas a las jurisdicciones acumuladas");
                    }
                }
            } catch (error) {
                respuesta.error = true;
                respuesta.mensaje = "Ha ocurrido un error inesperado al intentar obtener las retenciones generadas por jurisdiccion, detalles: " + error.message;
                log.error(proceso, respuesta.mensaje);
            }

            log.debug(proceso, "FIN - obtener Retencion Jurisdicciones / respuesta: " + JSON.stringify(respuesta));

            return respuesta;
        }

        // Función que permite devolver un número truncado a dos decimales
        function numberTruncTwoDec(nStr) {
            x = nStr.toString().split(".");
            x1 = x[0];
            x2 = x.length > 1 ? "." + x[1] : ".00";
            x2 = x2.length < 3 ? x2 + "0" : x2.substring(0, 3);
            return x1 + x2;
        }

        // Función que sirve para retornar cuantos decimales posee un número
        function countDecimales(number) {

            var cantidadDecimales = 0;

            if (!isEmpty(number)) {
                var arrayNumber = parseFloat(number, 10).toString().split(".");
                cantidadDecimales = (arrayNumber.length == 2) ? arrayNumber[1].length : 0;
            }

            return cantidadDecimales;
        }

        // Función que sirve para eliminar el separador decimal y transformar un número en entero.
        function convertToInteger(number) {

            var numberConvert = 0.0;

            if (!isEmpty(number))
                numberConvert = parseFloat(number, 10).toString().replace(".", "");

            return parseFloat(numberConvert, 10);
        }

        function numberToFixedDown(num, dec) {
            var exp = Math.pow(10, dec); // 
            return parseInt(num * exp, 10) / exp;
        }

        function isEmpty(value) {
            if (value === "") {
                return true;
            }

            if (value === null || value === "null") {
                return true;
            }

            if (value === undefined || value === "undefined") {
                return true;
            }

            return false;
        }

        function l54esOneworld() {

            var mySS = search.create({
                type: "customrecord_l54_datos_impositivos_emp",
                columns: [{
                    name: "internalid"
                }]
            });

            var arraySearchParams = [];

            var objParam = new Object({});
            objParam.name = "isinactive";
            objParam.operator = search.Operator.IS;
            objParam.values = ["F"];
            arraySearchParams.push(objParam);

            var objParam2 = new Object({});
            objParam2.name = "custrecord_l54_es_oneworld";
            objParam2.operator = search.Operator.IS;
            objParam2.values = ["T"];
            arraySearchParams.push(objParam2);

            var filtro = "";

            for (var i = 0; i < arraySearchParams.length; i++) {
                filtro = search.createFilter({
                    name: arraySearchParams[i].name,
                    operator: arraySearchParams[i].operator,
                    values: arraySearchParams[i].values
                });
                mySS.filters.push(filtro);
            }

            var searchresults = mySS.runPaged();

            if (searchresults != null && searchresults.count > 0)
                return true;
            else
                return false;
        }

        Number.prototype.toFixedOK = function (decimals) {
            var sign = this >= 0 ? 1 : -1;
            return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
        };

        // JSalazar: Función que verifica si un string en específico existe en un array
        function inArray(string, array) {

            for (var i = 0; i < array.length; i++) {
                if (array[i] == string) {
                    return true;
                }
            }

            return false;
        }

        /* JSalazar:
        En esta función se determinan cuales son las jurisdicciones IIBB que no pertenecen
        al proveedor, las mismas son definidas o seleccionadas en el campo de Jurisdicción única
        en las cabeceras de las facturas a pagar del proveedor.
        */
        function extraerJurisdiccionesGenerales(jurisdiccionesProveedor, jurisdiccionesCabecera) {

            var arrayJurisdiccionesGenerales = [];
            var arrayOfJurisdiccionesCabecera = [];
            var arrayOfJurisdiccionesProveedor = [];

            try {
                if (!isEmpty(jurisdiccionesProveedor) && !isEmpty(jurisdiccionesProveedor.jurisdicciones) && (jurisdiccionesProveedor.jurisdicciones.length > 0)) {
                    for (var i = 0; i < jurisdiccionesProveedor.jurisdicciones.length; i++)
                        arrayOfJurisdiccionesProveedor.push(jurisdiccionesProveedor.jurisdicciones[i].jurisdiccion);
                }

                if (!isEmpty(jurisdiccionesCabecera) && (jurisdiccionesCabecera.length > 0)) {
                    for (var j = 0; j < jurisdiccionesCabecera.length; j++)
                        arrayOfJurisdiccionesCabecera.push(jurisdiccionesCabecera[j].jurisdiccion);
                }

                log.audit("extraerJurisdiccionesGenerales", "arrayOfJurisdiccionesProveedor: " + JSON.stringify(arrayOfJurisdiccionesProveedor));
                log.audit("extraerJurisdiccionesGenerales", "arrayOfJurisdiccionesCabecera: " + JSON.stringify(arrayOfJurisdiccionesCabecera));

                if (!isEmpty(arrayOfJurisdiccionesCabecera) && (arrayOfJurisdiccionesCabecera.length > 0) && !isEmpty(arrayOfJurisdiccionesProveedor) && (arrayOfJurisdiccionesProveedor.length > 0)) {
                    for (var j = 0; j < arrayOfJurisdiccionesCabecera.length; j++) {

                        if (inArray(arrayOfJurisdiccionesCabecera[j], arrayOfJurisdiccionesProveedor) == false)
                            arrayJurisdiccionesGenerales.push(arrayOfJurisdiccionesCabecera[j]);

                    }
                }

                log.audit("extraerJurisdiccionesGenerales", "LINE 1331 - Jurisdicciones que no son del PROVEEDOR: " + JSON.stringify(arrayJurisdiccionesGenerales));
            } catch (e) {
                log.error("extraerJurisdiccionesGenerales", "LINE 1334, ERROR extraerJurisdiccionesGenerales: " + e.message);
            }

            return arrayJurisdiccionesGenerales;
        }

        /*JSalazar:
        Función realizada para retornar las jurisdicciones que no están en las jurisdicciones 
        del proveedor ni en la Configuración General IIBB.
        @objEstadoInscripcionJurIIBB: tiene todas las jurisdicciones configuradas en el 
        proveedor y en la config General IIBB
        @arrayJurisdicciones: tiene todas las jurisdicciones IIBB que no pertenecen al proveedor 
        y que fueron ingresadas a nivel de cabeceras
        @resultsNetosJurisdiccion: contiene la información de las facturas con Jurisdicción Única
        */
        function jurisdiccionesNotValid(objEstadoInscripcionJurIIBB, arrayJurisdicciones, resultsNetosJurisdiccion) {

            var arrayJurisdiccionesNotValid = [];
            var arrayJurisdiccionesNotValidAux = [];
            var arrayOfJurisdiccionesProveedor = [];
            var mensajeJurisdiccionesNotValid = "";

            try {
                //Se incluye en un array todas las jurisdicciones que están configuradas en el proveedor y en la config general IIBB
                if (!isEmpty(objEstadoInscripcionJurIIBB) && !isEmpty(objEstadoInscripcionJurIIBB.jurisdicciones) && (objEstadoInscripcionJurIIBB.jurisdicciones.length > 0)) {
                    for (var k = 0; k < objEstadoInscripcionJurIIBB.jurisdicciones.length; k++)
                        arrayOfJurisdiccionesProveedor.push(objEstadoInscripcionJurIIBB.jurisdicciones[k].jurisdiccion);
                }

                log.audit("jurisdiccionesNotValid", "line 1396 - arrayOfJurisdiccionesProveedor and IIBB config gen: " + JSON.stringify(arrayOfJurisdiccionesProveedor));

                //Se determinan cuales son las jurisdicciones no válidas: las que no están en la configuración IIBB ni en la configuración del proveedor
                if (!isEmpty(arrayJurisdicciones) && (arrayJurisdicciones.length > 0) && !isEmpty(arrayOfJurisdiccionesProveedor) && (arrayOfJurisdiccionesProveedor.length > 0)) {
                    for (var j = 0; j < arrayJurisdicciones.length; j++) {
                        if (inArray(arrayJurisdicciones[j], arrayOfJurisdiccionesProveedor) == false)
                            arrayJurisdiccionesNotValidAux.push(arrayJurisdicciones[j]);
                    }
                }

                log.audit("jurisdiccionesNotValid", "line 1406 - arrayJurisdiccionesNotValidAux: " + JSON.stringify(arrayJurisdiccionesNotValidAux));

                //Se almacenan las jurisdicciones no válidas seleccionadas en el campo de Jurisdicción Única de las facturas a nivel de cabecera
                if (!isEmpty(arrayJurisdiccionesNotValidAux) && (arrayJurisdiccionesNotValidAux.length > 0) && !isEmpty(resultsNetosJurisdiccion) && (resultsNetosJurisdiccion.length > 0)) {
                    for (var j = 0; j < resultsNetosJurisdiccion.length; j++) {
                        if (inArray(resultsNetosJurisdiccion[j].jurisdiccion, arrayJurisdiccionesNotValidAux) == true)
                            arrayJurisdiccionesNotValid.push(resultsNetosJurisdiccion[j]);
                    }
                }

                log.audit("jurisdiccionesNotValid", "line 1416 - arrayJurisdiccionesNotValid: " + JSON.stringify(arrayJurisdiccionesNotValid));

                //Se verifica si existen jurisdicciones no válidas y se devuelve en un mensaje el ID de las facturas que las contienen
                if (!isEmpty(arrayJurisdiccionesNotValid) && (arrayJurisdiccionesNotValid.length > 0)) {
                    for (var j = 0; j < arrayJurisdiccionesNotValid.length; j++) {
                        mensajeJurisdiccionesNotValid += arrayJurisdiccionesNotValid[j].referenceNumber + ",";
                    }
                    //se elimina el último caractér que es una coma
                    mensajeJurisdiccionesNotValid = mensajeJurisdiccionesNotValid.slice(0, -1);
                }
            } catch (e) {
                log.error("jurisdiccionesNotValid", "LINE 1409 - Error catch: " + e.mensaje);
            }

            return mensajeJurisdiccionesNotValid;
        }

        // Función que me valida los seteos necesarios para realizar el calculo de las retenciones
        function validarCalculosRetenciones(informacionPago) {

            log.audit("L54 - Calculo Retenciones", "INICIO - validarCalculosRetenciones");
            log.debug("L54 - Calculo Retenciones", "Parametros - informacionPago: " + JSON.stringify(informacionPago) + " - Subsidiaria: " + informacionPago.subsidiaria);

            var validacion = new Object();
            validacion.error = false;
            validacion.mensaje = "";
            validacion.datosImpositivos = new Object();
            validacion.isTI = new Array();

            var datosImpositivos = consultaDatosImpositivos(informacionPago.subsidiaria);
            validacion.datosImpositivos = datosImpositivos;

            if (isEmpty(informacionPago.entity)) {
                validacion.error = true;
                validacion.mensaje = "Por favor seleccione un Proveedor para poder calcular las retenciones. Verifique y vuelva a intentar.";

            }

            if (isEmpty(informacionPago.trandate)) {
                validacion.error = true;
                validacion.mensaje = "Por favor seleccione la fecha de Pago para poder calcular las retenciones. Verifique y vuelva a intentar.";

            }

            if (!datosImpositivos[0].esAgenteGanancias && !datosImpositivos[0].esAgenteSUSS && !datosImpositivos[0].esAgenteIVA && !datosImpositivos[0].esAgenteIIBB) {
                validacion.error = true;
                validacion.mensaje = "La Compañia no es agente de retención de ningún régimen. Verifique y vuelva a intentar.";
            }

            /*if (!esAgenteRetencion("gan", subsidiaria) && !esAgenteRetencion("suss", subsidiaria) && !esAgenteRetencion("iva", subsidiaria) && !esAgenteRetencion("iibb", subsidiaria)) {
                validacion.error = true;
                validacion.mensaje = "La Compañia no es agente de retención de ningún régimen. Verifique y vuelva a intentar.";
            }*/

            if (isEmpty(informacionPago.facturas) || informacionPago.facturas.length < 1) {
                validacion.error = true;
                validacion.mensaje = "Debe seleccionar al menos una factura para poder calcular las retenciones. Verifique y vuelva a intentar.";
            }
            /** Mejora Transacciones Internas */
            if(informacionPago.facturas.length > 0 && !datosImpositivos[0].calcularTI){
                for (let i = 0; i < informacionPago.facturas.length; i++) {
                    const element = informacionPago.facturas[i];
                    let fact = search.lookupFields({
                        type: search.Type.VENDOR_BILL,
                        id: element.idVendorBill,
                        columns: ['custbody_l54_trans_interna']
                    });
                    log.debug("fact", fact.custbody_l54_trans_interna)
                    
                    if (fact.custbody_l54_trans_interna){
                        validacion.isTI.push(element.idVendorBill);
                    }
                }

                if (informacionPago.facturas.length == validacion.isTI.length) {
                    validacion.error = true;
                    validacion.mensaje = "No se aplica el cálculo de retenciones para las transacciones marcadas como Transaccion Interna. Puede modificarlo en la Configuración de Datos Impositivos para la subsidiaria.";
                }
            }
            /*if (!verificarFacturasSeleccionadas(informacionPago)) {
                validacion.error = true;
                validacion.mensaje = "Debe seleccionar al menos una factura para poder calcular las retenciones. Verifique y vuelva a intentar.";
            }*/

            log.debug("L54 - Calculo Retenciones", "RETURN - validacion: " + JSON.stringify(validacion));
            log.audit("L54 - Calculo Retenciones", "FIN - validarCalculosRetenciones");
            return validacion;

        }

        // Función que me devuelve true/false, indicando si la compañia es agente de retención del régimen enviado por parametro
        function esAgenteRetencion(tipo_ret, subsidiaria) {

            log.audit("L54 - Calculo Retenciones", "INICIO - esAgenteRetencion");
            log.debug("L54 - Calculo Retenciones", "Parametros - - tipo_ret: " + tipo_ret + ", subsidiaria: " + subsidiaria);

            //customsearch_3k_datos_imp_empresa
            var searchDatosImpositivos = search.load({
                id: "customsearch_3k_datos_imp_empresa"
            });

            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "custrecord_l54_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchDatosImpositivos.filters.push(filtroSubsidiaria);
            }

            var resultSet = searchDatosImpositivos.run();

            var searchResult = resultSet.getRange({
                start: 0,
                end: 1
            });

            var esAgenteGanancias = "";
            var esAgenteIIBB = "";
            var esAgenteIVA = "";
            var esAgenteSUSS = "";
            var subsidiariaSS = "";

            if (!isEmpty(searchResult) && searchResult.length > 0) {
                subsidiariaSS = searchResult[0].getValue({
                    name: resultSet.columns[8]
                });
                esAgenteGanancias = searchResult[0].getValue({
                    name: resultSet.columns[12]
                });
                esAgenteIIBB = searchResult[0].getValue({
                    name: resultSet.columns[13]
                });
                esAgenteIVA = searchResult[0].getValue({
                    name: resultSet.columns[14]
                });
                esAgenteSUSS = searchResult[0].getValue({
                    name: resultSet.columns[15]
                });
            }

            if (((tipo_ret == "gan") && (esAgenteGanancias == true)) || ((tipo_ret == "iibb") && (esAgenteIIBB == true)) || ((tipo_ret == "iva") && (esAgenteIVA == true)) || ((tipo_ret == "suss") && (esAgenteSUSS == true))) {
                log.debug("L54 - Calculo Retenciones", "RETURN - TRUE");
                log.audit("L54 - Calculo Retenciones", "FIN - esAgenteRetencion");
                return true;
            } else {
                log.debug("L54 - Calculo Retenciones", "RETURN - FALSE");
                log.audit("L54 - Calculo Retenciones", "FIN - esAgenteRetencion");
                return false;
            }


        }

        // Función que me devuelve la información de Datos Impositivos de la empresa según la subsidiaria.
        function consultaDatosImpositivos(subsidiaria) {

            log.audit("L54 - Calculo Retenciones", "INICIO - consultaDatosImpositivos");
            log.debug("L54 - Calculo Retenciones", "Parámetros - subsidiaria: " + subsidiaria);

            var searchDatosImpositivos = search.load({
                id: "customsearch_3k_datos_imp_empresa"
            });

            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "custrecord_l54_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchDatosImpositivos.filters.push(filtroSubsidiaria);
            }

            var resultSet = searchDatosImpositivos.run();

            var searchResult = resultSet.getRange({
                start: 0,
                end: 1
            });

            if (!isEmpty(searchResult)) {
                if (searchResult.length > 0) {
                    var arrayDatosImpositivos = new Array();
                    var objDatosImpositivos = new Object();

                    objDatosImpositivos.subsidiariaSS = searchResult[0].getValue({
                        name: resultSet.columns[8]
                    });
                    //Agente de Retención
                    objDatosImpositivos.esAgenteGanancias = searchResult[0].getValue({
                        name: resultSet.columns[12]
                    });
                    objDatosImpositivos.esAgenteIIBB = searchResult[0].getValue({
                        name: resultSet.columns[13]
                    });
                    objDatosImpositivos.esAgenteIVA = searchResult[0].getValue({
                        name: resultSet.columns[14]
                    });
                    objDatosImpositivos.esAgenteSUSS = searchResult[0].getValue({
                        name: resultSet.columns[15]
                    });
                    //Exento
                    objDatosImpositivos.exentoIIBB = searchResult[0].getValue({
                        name: resultSet.columns[16]
                    });
                    objDatosImpositivos.exentoSUSS = searchResult[0].getValue({
                        name: resultSet.columns[17]
                    });
                    objDatosImpositivos.exentoIVA = searchResult[0].getValue({
                        name: resultSet.columns[18]
                    });
                    objDatosImpositivos.exentoGanancias = searchResult[0].getValue({
                        name: resultSet.columns[19]
                    });
                    objDatosImpositivos.calRetAutomaticamente = searchResult[0].getValue({
                        name: resultSet.columns[23]
                    });
                    objDatosImpositivos.numXLocation = searchResult[0].getValue({
                        name: resultSet.columns[24]
                    });
                    objDatosImpositivos.idCCRetGAN = searchResult[0].getValue({
                        name: resultSet.columns[25]
                    });
                    objDatosImpositivos.idCCRetSUSS = searchResult[0].getValue({
                        name: resultSet.columns[27]
                    });
                    objDatosImpositivos.idCCRetIVA = searchResult[0].getValue({
                        name: resultSet.columns[29]
                    });
                    objDatosImpositivos.folderIdRetenciones = searchResult[0].getValue({
                        name: resultSet.columns[11]
                    });
                    objDatosImpositivos.indBenefAsientoRet = searchResult[0].getValue({
                        name: resultSet.columns[31]
                    });
                    objDatosImpositivos.esONG = searchResult[0].getValue({
                        name: resultSet.columns[32]
                    });
                    objDatosImpositivos.jurisdiccionEmpresa = searchResult[0].getValue({
                        name: resultSet.columns[7]
                    });
                    objDatosImpositivos.calcularTI = searchResult[0].getValue({
                        name: resultSet.columns[35]
                    });
                    arrayDatosImpositivos.push(objDatosImpositivos);
                    log.debug("L54 - Calculo Retenciones", "RETURN - arrayDatosImpositivos: " + JSON.stringify(arrayDatosImpositivos));
                    log.audit("L54 - Calculo Retenciones", "FIN - consultaDatosImpositivos");
                    return arrayDatosImpositivos;
                }
            }
            else {
                log.error("L54 - Calcular Retenciones (SS)", "No se encuentra registrada la Configuración de Datos Impositivos para la subsidiaria " + subsidiariaSS + " .");
                log.audit("L54 - Calculo Retenciones", "FIN - consultaDatosImpositivos");
                return false;
            }

        }

        // Método que verifica si para el pago actual, hay al menos una factura seleccionada
        /*function verificarFacturasSeleccionadas(informacionPago) {

            log.audit("L54 - Calculo Retenciones", "INICIO - verificarFacturasSeleccionadas");
            log.debug("L54 - Calculo Retenciones", "Parámetros - informacionPago: "+ JSON.stringify(informacionPago));
            if (informacionPago.facturas != null && informacionPago.facturas.length > 0){
                log.debug("L54 - Calculo Retenciones", "RETURN - TRUE");
                log.audit("L54 - Calculo Retenciones", "FIN - verificarFacturasSeleccionadas");
                return true;
            }else{
                log.debug("L54 - Calculo Retenciones", "RETURN - FALSE");
                log.audit("L54 - Calculo Retenciones", "FIN - verificarFacturasSeleccionadas");                
                return false;    
            }    

        }*/

        // Método que me devuelve las jurisdicciones en las cuales la compañia es agente de retención.
        function obtenerJurisdiccionesAgenteRetencion(subsidiaria) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtenerJurisdiccionesAgenteRetencion");
            log.debug("L54 - Calculo Retenciones", "Parámetros - subsidiaria: " + subsidiaria);

            var jurisdiccionesVinculadas = null;
            var resultadoJurisdicciones = new Object();
            resultadoJurisdicciones.idConfGeneral = 0;
            resultadoJurisdicciones.jurisdicciones = new Array();

            var searchIIBBConfigGeneral = search.load({
                id: "customsearch_l54_pv_iibb_config_general"
            });

            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "custrecord_l54_pv_gral_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchIIBBConfigGeneral.filters.push(filtroSubsidiaria);
            }

            var resultSet = searchIIBBConfigGeneral.run();

            var searchResult = resultSet.getRange({
                start: 0,
                end: 1
            });

            if (!isEmpty(searchResult) && searchResult.length > 0) {

                resultadoJurisdicciones.idConfGeneral = searchResult[0].getValue({
                    name: resultSet.columns[0]
                });

                jurisdiccionesVinculadas = searchResult[0].getValue({
                    name: resultSet.columns[1]
                });

                resultadoJurisdicciones.idTipoContribIIBBDefault = searchResult[0].getValue({
                    name: resultSet.columns[2]
                });

                resultadoJurisdicciones.idTipoContribIIBBDefaultText = searchResult[0].getText({
                    name: resultSet.columns[2]
                });
            }

            if (jurisdiccionesVinculadas != null && jurisdiccionesVinculadas.length > 0) {
                // Hago Split de las Jurisdicciones
                var arrayJurisdicciones = jurisdiccionesVinculadas.split(",");
                if (arrayJurisdicciones != null && arrayJurisdicciones.length > 0) {
                    for (var i = 0; arrayJurisdicciones != null && i < arrayJurisdicciones.length; i++) {
                        resultadoJurisdicciones.jurisdicciones[i] = arrayJurisdicciones[i];
                    }
                }
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - resultadoJurisdicciones: " + JSON.stringify(resultadoJurisdicciones));
            log.audit("L54 - Calculo Retenciones", "FIN - obtenerJurisdiccionesAgenteRetencion");
            return resultadoJurisdicciones;

        }

        // Método que me devuelve por cada Jurisdiccion de IIBB las jurisdicciones a las cuales el Proveedor esta Inscripto y el estado de Inscripcion
        function getProveedorInscriptoRegimenIIBB(id_proveedor, idEstadoExento, jurisdiccionesIIBB, jurisdiccionesEntregaFacturas, idTipoContribIIBBDefault, idTipoContribIIBBDefaultText, infoJurisdiccionesConfigGeneral, trandate) {

            var proceso = "L54 - Calculo Retenciones";
            log.audit("L54 - Calculo Retenciones", "INICIO - getProveedorInscriptoRegimenIIBB");
            log.audit("L54 - Calculo Retenciones", "Parámetros - id_proveedor: " + id_proveedor + ", idEstadoExento: " + idEstadoExento + ", jurisdiccionesIIBB: " + JSON.stringify(jurisdiccionesIIBB) + " - jurisdiccionesEntregaFacturas: " + JSON.stringify(jurisdiccionesEntregaFacturas) + " idTipoContribIIBBDefault: " + idTipoContribIIBBDefault + " - idTipoContribIIBBDefaultText: " + idTipoContribIIBBDefaultText + " - infoJurisdiccionesConfigGeneral: " + JSON.stringify(infoJurisdiccionesConfigGeneral) + " - trandate: " + trandate);

            var jurisdiccionesAux = new Array();
            var estadoInscripcionProveedor = new Object();
            estadoInscripcionProveedor.iibb = false;
            estadoInscripcionProveedor.jurisdicciones = new Array();
            estadoInscripcionProveedor.warning = false;
            estadoInscripcionProveedor.mensajeWarning = "";
            var indiceJurisdicciones = 0;
            var avisoCertificadoRegimenVencido = false;
            var jurisdiccionesCertfVencido = "";
            var jurisdiccionGeneral = false;
            var jurisdiccionesProveedorIIBB = [];
            var jurisdProveedor = [];

            // var today = new Date();
            //if (jurisdiccionesIIBB != null && id_proveedor != null) {
            if (jurisdiccionesIIBB != null) {
                var searchJurisdiccionesIIBB = search.load({
                    id: "customsearch_l54_jurisdicciones_iibb"
                });

                if (!isEmpty(id_proveedor)) {
                    var filtroProveedor = search.createFilter({
                        name: "custrecord_l54_jurisdicciones_iibb_prov",
                        operator: search.Operator.IS,
                        values: id_proveedor
                    });
                    searchJurisdiccionesIIBB.filters.push(filtroProveedor);
                } else {
                    jurisdiccionGeneral = true;
                }

                if (!isEmpty(jurisdiccionesIIBB)) {
                    var filtroJurisdicciones = search.createFilter({
                        name: "custrecord_l54_jurisdicciones_iibb_jur",
                        operator: search.Operator.ANYOF,
                        values: jurisdiccionesIIBB
                    });
                    searchJurisdiccionesIIBB.filters.push(filtroJurisdicciones);
                }

                var resultSearch = searchJurisdiccionesIIBB.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }

                    // increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!isEmpty(resultado) && resultado.length > 0);

                if (!isEmpty(completeResultSet)) {

                    for (var i = 0; i < completeResultSet.length; i++) {

                        var fecha_caducidad_parseada = null;

                        var jurisdiccion = completeResultSet[i].getValue({
                            name: resultSearch.columns[1]
                        });

                        jurisdiccionesProveedorIIBB.push(jurisdiccion);

                        var jurisdiccionTexto = completeResultSet[i].getText({
                            name: resultSearch.columns[1]
                        });

                        var estado_regimen = completeResultSet[i].getValue({
                            name: resultSearch.columns[2]
                        });

                        var estado_regimen_texto = completeResultSet[i].getText({
                            name: resultSearch.columns[2]
                        });

                        var fecha_caducidad = completeResultSet[i].getValue({
                            name: resultSearch.columns[3]
                        });

                        var certificado_exencion = completeResultSet[i].getValue({
                            name: resultSearch.columns[4]
                        });

                        var tipo_exencion = completeResultSet[i].getValue({
                            name: resultSearch.columns[5]
                        });

                        var esAgenteRetencion = completeResultSet[i].getValue({
                            name: resultSearch.columns[6]
                        });

                        var jurisdiccionCodigo = completeResultSet[i].getValue({
                            name: resultSearch.columns[7]
                        });

                        var jurisdiccionSede = convertToBoolean(completeResultSet[i].getValue({
                            name: resultSearch.columns[8]
                        }));

                        if (!isEmpty(fecha_caducidad)) {
                            fecha_caducidad_parseada = parseDate(fecha_caducidad);
                            fecha_caducidad_parseada.setHours(0, 0, 0, 0);
                        }

                        //log.error("L54 - Calculo Retenciones", "fecha caducidad parseada: " + fecha_caducidad_parseada + " - fecha: " + fecha_caducidad);
                        log.audit("L54 - Calculo Retenciones", "FECHA CADUCIDAD: " + fecha_caducidad + " - CERTIFICADO IIBB PARSEADA: " + fecha_caducidad_parseada + " - fecha o trandate de pago de proveedor (OP): " + trandate);
                        var infoJurisdiccion = {};
                        infoJurisdiccion.calcRet = false;
                        infoJurisdiccion.idInterno = jurisdiccion;

                        // No Considerar Retenciones A Otros Agentes de Retencion
                        if (esAgenteRetencion != true) {
                            if (estado_regimen != idEstadoExento) {
                                if ((isEmpty(fecha_caducidad_parseada)) || (!isEmpty(fecha_caducidad_parseada) && (fecha_caducidad_parseada < trandate))) {
                                    if (!isEmpty(fecha_caducidad_parseada) && (fecha_caducidad_parseada < trandate)) {
                                        avisoCertificadoRegimenVencido = true;
                                        if (isEmpty(jurisdiccionesCertfVencido)) {
                                            jurisdiccionesCertfVencido = jurisdiccionTexto;
                                        } else {
                                            jurisdiccionesCertfVencido = jurisdiccionesCertfVencido + "," + jurisdiccionTexto;
                                        }
                                    }

                                    if (jurisdiccionesAux.indexOf(jurisdiccion) == -1) {
                                        estadoInscripcionProveedor.iibb = true;
                                        estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones] = new Object();
                                        estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccion = jurisdiccion;
                                        jurisdiccionesAux[indiceJurisdicciones] = jurisdiccion;
                                        estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccionTexto = jurisdiccionTexto;
                                        estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].tipoContribuyente = !isEmpty(estado_regimen) ? estado_regimen : idTipoContribIIBBDefault;
                                        estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].tipoContribuyenteTexto = !isEmpty(estado_regimen_texto) ? estado_regimen_texto : idTipoContribIIBBDefaultText;
                                        estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].certExencion = certificado_exencion;
                                        estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].tipoExencion = tipo_exencion;
                                        estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].fcaducidadExencion = fecha_caducidad_parseada;
                                        estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].esJurisdiccionGeneral = jurisdiccionGeneral;
                                        estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccionCodigo = jurisdiccionCodigo;
                                        estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccionSede = jurisdiccionSede;
                                        indiceJurisdicciones = parseInt(indiceJurisdicciones, 10) + parseInt(1, 10);

                                        infoJurisdiccion.calcRet = true;
                                    }
                                }
                            }
                        }

                        jurisdProveedor.push(infoJurisdiccion);
                    }
                }

                // Aviso de los Certificados Vencidos
                if (avisoCertificadoRegimenVencido == true) {
                    //alert("Aviso: las retenciones para las Jurisdicciones : " + jurisdiccionesCertfVencido + " serán calculadas, debido a que los certificados de exención de IIBB se encuentran vencidos.");
                    estadoInscripcionProveedor.warning = true;
                    estadoInscripcionProveedor.mensajeWarning = "Las retenciones para las Jurisdicciones : " + jurisdiccionesCertfVencido + " serán calculadas, debido a que los certificados de caducidad de IIBB se encuentran vencidos.";
                }

                log.debug(proceso, "jurisdProveedor: " + JSON.stringify(jurisdProveedor));

                // Ingreso a las jurisdicciones definidas como jurisdicciones de entrega si no encuentran en las jurisdicciones del proveedor ya definidas pero si en la config general IIBB
                if (!isEmpty(jurisdiccionesEntregaFacturas) && jurisdiccionesEntregaFacturas.length > 0 && !jurisdiccionGeneral) {
                    for (var i = 0; i < jurisdiccionesEntregaFacturas.length; i++) {

                        var jurisdiccionEntrega = jurisdiccionesEntregaFacturas[i].jurisdiccionEntregaID;
                        var jurisdiccionEntregaText = jurisdiccionesEntregaFacturas[i].jurisdiccionEntregaNombre;
                        var jurisdiccionEntregaCodigo = jurisdiccionesEntregaFacturas[i].jurisdiccionEntregaCodigo;
                        var calcRetNoInscJurEnt = jurisdiccionesEntregaFacturas[i].calcRetNoInscJurEnt;

                        // Se obtiene el detalle para saber si la jurisdiccion de entrega esta en el proveedor
                        var detalleJurisdProv = jurisdProveedor.filter(function (obj) {
                            return (obj.idInterno == jurisdiccionEntrega);
                        });

                        var calcRet = false;

                        // Si la jurisdiccion esta en las del proveedor se debe validar si esta exento, agente de percepcion, si se calcula percepcion
                        if (!isEmpty(detalleJurisdProv) && detalleJurisdProv.length > 0) {
                            calcRet = detalleJurisdProv[0].calcRet;
                        } else if (calcRetNoInscJurEnt) {
                            calcRet = true;
                        }

                        // Si la Jurisdiccion de Entrega No se encuentra ya definida en el array de jurisdicciones del proveedor
                        if ((jurisdiccionesAux.length == 0 || jurisdiccionesAux.indexOf(jurisdiccionEntrega) == -1) && calcRet) {
                            // Si la jurisdicción de entrega no se encuentra entre las definidas por el proveedor, acá se verifica si está en el proveedor pero no en el array aux, para determinar si no fue agregada por certificado vencido u otra razon
                            if (jurisdiccionesProveedorIIBB.length == 0 || jurisdiccionesProveedorIIBB.indexOf(jurisdiccionEntrega) == -1) {
                                // Verifico que la Jurisdicción de Entrega sea una jurisdicción de la Empresa
                                if (jurisdiccionesIIBB.indexOf(jurisdiccionEntrega) >= 0) {
                                    estadoInscripcionProveedor.iibb = true;
                                    estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones] = new Object();
                                    estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccion = jurisdiccionEntrega;
                                    jurisdiccionesAux[indiceJurisdicciones] = jurisdiccionEntrega;
                                    estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccionTexto = jurisdiccionEntregaText;
                                    estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].tipoContribuyente = idTipoContribIIBBDefault;
                                    estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].tipoContribuyenteTexto = idTipoContribIIBBDefaultText;
                                    estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].certExencion = "";
                                    estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].tipoExencion = "";
                                    estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].fcaducidadExencion = "";
                                    estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].esJurisdiccionGeneral = jurisdiccionGeneral;
                                    estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccionCodigo = jurisdiccionEntregaCodigo;
                                    estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccionSede = false;
                                    indiceJurisdicciones = parseInt(indiceJurisdicciones, 10) + parseInt(1, 10);
                                }
                            }
                        }
                    }
                }

                // Verifico si la jurisdicción de TUCUMÁN está en las jurisdicciones de la empresa y lo introduzco como si fuese una configuración del proveedor porque esta jurisdicción funciona de esta manera
                if (!utilidades.isEmpty(infoJurisdiccionesConfigGeneral) && infoJurisdiccionesConfigGeneral.length > 0 && !jurisdiccionGeneral) {
                    var jurisdiccionTucuman = "";
                    var jurisdiccionTucumanText = "";
                    var jurisdiccionTucumanCodigo = "";

                    // Verifico si la jurisdicción es de TUCUMÁN para sacar sus datos.
                    for (var i = 0; i < infoJurisdiccionesConfigGeneral.length; i++) {
                        if (infoJurisdiccionesConfigGeneral[i].codigoJurisdiccion == 924) {
                            var jurisdiccionTucuman = infoJurisdiccionesConfigGeneral[i].idJurisdiccion;
                            var jurisdiccionTucumanText = infoJurisdiccionesConfigGeneral[i].nombreJurisdiccion;
                            var jurisdiccionTucumanCodigo = infoJurisdiccionesConfigGeneral[i].codigoJurisdiccion;
                            break;
                        }
                    }

                    // Si la Jurisdiccion de TUCUMÁN No se encuentra ya definida en el array de jurisdicciones del proveedor
                    if (jurisdiccionesAux.length == 0 || jurisdiccionesAux.indexOf(jurisdiccionTucuman) == -1) {
                        // Si la jurisdicción de TUCUMÁN no se encuentra entre las definidas por el proveedor, acá se verifica si está en el proveedor pero no en el array aux, para determinar si no fue agregada por certificado vencido u otra razon
                        if (jurisdiccionesProveedorIIBB.length == 0 || jurisdiccionesProveedorIIBB.indexOf(jurisdiccionTucuman) == -1) {
                            // Verifico que la Jurisdicción de TUCUMÁN sea una jurisdicción de la Empresa
                            if (jurisdiccionesIIBB.indexOf(jurisdiccionTucuman) >= 0) {
                                estadoInscripcionProveedor.iibb = true;
                                estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones] = new Object();
                                estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccion = jurisdiccionTucuman;
                                jurisdiccionesAux[indiceJurisdicciones] = jurisdiccionTucuman;
                                estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccionTexto = jurisdiccionTucumanText;
                                estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].tipoContribuyente = idTipoContribIIBBDefault;
                                estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].tipoContribuyenteTexto = idTipoContribIIBBDefaultText;
                                estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].certExencion = "";
                                estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].tipoExencion = "";
                                estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].fcaducidadExencion = "";
                                estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].esJurisdiccionGeneral = jurisdiccionGeneral;
                                estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccionCodigo = jurisdiccionTucumanCodigo;
                                estadoInscripcionProveedor.jurisdicciones[indiceJurisdicciones].jurisdiccionSede = false;
                                indiceJurisdicciones = parseInt(indiceJurisdicciones, 10) + parseInt(1, 10);
                            }
                        }
                    }
                }
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - estadoInscripcionProveedor: " + JSON.stringify(estadoInscripcionProveedor));
            log.audit("L54 - Calculo Retenciones", "FIN - getProveedorInscriptoRegimenIIBB");
            return estadoInscripcionProveedor;
        }


        // Método que me devuelve true/false, indicando si el proveedor esta inscripto al regimen enviado por parametro
        function getProveedorInscriptoRegimen(id_proveedor, estadoExentoGan, estadoExentoSUSS, estadoExentoIVA, trandate) {

            log.audit("L54 - Calculo Retenciones", "INICIO - getProveedorInscriptoRegimen");
            log.debug("L54 - Calculo Retenciones", "Parámetros - id_proveedor: " + id_proveedor + ", estadoExentoGan: " + estadoExentoGan + ", estadoExentoSUSS: " + estadoExentoSUSS + ", estadoExentoIVA: " + estadoExentoIVA + " - trandate: " + trandate);

            var proveedorInscripto = new Object();
            proveedorInscripto.warning_gan = false;
            proveedorInscripto.warning_suss = false;
            proveedorInscripto.warning_iva = false;

            proveedorInscripto.mensaje_gan = "";
            proveedorInscripto.mensaje_suss = "";
            proveedorInscripto.mensaje_iva = "";

            proveedorInscripto.inscripto_regimen_gan = false;
            proveedorInscripto.inscripto_regimen_suss = false;
            proveedorInscripto.inscripto_regimen_iva = false;

            var inscripto_regimen_gan = false;
            var inscripto_regimen_suss = false;
            var inscripto_regimen_iva = false;
            // var today = new Date();


            var searchProvInscripto = search.load({
                id: "customsearch_l54_prov_insc_regimen"
            });

            if (!isEmpty(id_proveedor)) {
                var filtroProveedor = search.createFilter({
                    name: "internalid",
                    operator: search.Operator.IS,
                    values: id_proveedor
                });
                searchProvInscripto.filters.push(filtroProveedor);
            }

            var resultSet = searchProvInscripto.run();

            var searchResult = resultSet.getRange({
                start: 0,
                end: 1
            });

            //log.debug("L54 - Calcular Retenciones (SS) - LINE 1165", "searchResult.length: " +searchResult.length);

            if (!isEmpty(searchResult) && searchResult.length > 0) {
                var estadoRegimenIVA = searchResult[0].getValue({
                    name: resultSet.columns[1]
                });
                var estadoRegimenGan = searchResult[0].getValue({
                    name: resultSet.columns[2]
                });
                var estadoRegimenSUSS = searchResult[0].getValue({
                    name: resultSet.columns[3]
                });
                var fechaCaducidadIVA = searchResult[0].getValue({
                    name: resultSet.columns[4]
                });
                var fechaCaducidadGan = searchResult[0].getValue({
                    name: resultSet.columns[5]
                });
                var fechaCaducidadSUSS = searchResult[0].getValue({
                    name: resultSet.columns[6]
                });

                tipoContGAN = estadoRegimenGan;
                tipoContSUSS = estadoRegimenSUSS;
            }

            if (!isEmpty(fechaCaducidadIVA)) {
                fechaCaducidadIVA = parseDate(fechaCaducidadIVA);
                fechaCaducidadIVA.setHours(0, 0, 0, 0);
            }

            if (!isEmpty(fechaCaducidadGan)) {
                fechaCaducidadGan = parseDate(fechaCaducidadGan);
                fechaCaducidadGan.setHours(0, 0, 0, 0);
            }

            if (!isEmpty(fechaCaducidadSUSS)) {
                fechaCaducidadSUSS = parseDate(fechaCaducidadSUSS);
                fechaCaducidadSUSS.setHours(0, 0, 0, 0);
            }

            log.audit("L54 - Calculo Retenciones", "LINE 4956 - Fecha Caducidad gan: " + fechaCaducidadGan + " - Fecha Caducidad suss: " + fechaCaducidadSUSS + " - Fecha Caducidad iva: " + fechaCaducidadIVA + " - fecha o trandate de pago de proveedor (OP): " + trandate);
            // ganancias no es Exento
            if (estadoRegimenGan != estadoExentoGan) {
                if (!isEmpty(fechaCaducidadGan)) {
                    if (fechaCaducidadGan < trandate) {
                        proveedorInscripto.warning_gan = true;
                        proveedorInscripto.mensaje_gan = "Las retenciones serán calculadas, debido a que el certificado de exención de Ganancias se encuentra vencido.";
                        inscripto_regimen_gan = true;
                    } else
                        inscripto_regimen_gan = false;
                }
                else {
                    inscripto_regimen_gan = true;
                }
            } else
                inscripto_regimen_gan = false;

            // en SUSS es No Inscripto
            // se verifica si no es exento
            if (estadoRegimenSUSS !== estadoExentoSUSS) {
                if (!isEmpty(fechaCaducidadSUSS)) {
                    if (fechaCaducidadSUSS < trandate) {
                        //alert("Aviso: las retenciones serán calculadas, debido a que el certificado de exención de SUSS se encuentra vencido.");
                        proveedorInscripto.warning_suss = true;
                        proveedorInscripto.mensaje_suss = "Las retenciones serán calculadas, debido a que el certificado de caducidad de SUSS se encuentra vencido.";
                        inscripto_regimen_suss = true;
                    } else
                        inscripto_regimen_suss = false;
                }
                else
                    inscripto_regimen_suss = true;
            } else
                inscripto_regimen_suss = false;

            // en IVA es No Inscripto
            // se verifica si no es exento
            if (estadoRegimenIVA !== estadoExentoIVA) {
                if (!isEmpty(fechaCaducidadIVA)) {
                    if (fechaCaducidadIVA < trandate) {
                        //alert("Aviso: las retenciones serán calculadas, debido a que el certificado de exención de IVA se encuentra vencido.");
                        proveedorInscripto.warning_iva = true;
                        proveedorInscripto.mensaje_iva = "Las retenciones serán calculadas, debido a que el certificado de caducidad de IVA se encuentra vencido.";
                        inscripto_regimen_iva = true;
                    } else
                        inscripto_regimen_iva = false;
                } else
                    inscripto_regimen_iva = true;
            } else
                inscripto_regimen_iva = false;

            // en IIBB es No Inscripto
            // Se consulta en otra Funcion por Jurisdicciones

            proveedorInscripto.inscripto_regimen_gan = inscripto_regimen_gan;
            proveedorInscripto.inscripto_regimen_suss = inscripto_regimen_suss;
            proveedorInscripto.inscripto_regimen_iva = inscripto_regimen_iva;

            log.debug("L54 - Calculo Retenciones", "RETURN - proveedorInscripto: " + JSON.stringify(proveedorInscripto));
            log.audit("L54 - Calculo Retenciones", "FIN - getProveedorInscriptoRegimen");
            return proveedorInscripto;

        }

        // NZERPA - Funcion que devuelve información del RT "Parametrizacion Retenciones"
        function parametrizacionRetenciones(subsidiaria) {

            log.audit("L54 - Calculo Retenciones", "INICIO - parametrizacionRetenciones");
            log.debug("L54 - Calculo Retenciones", "Parámetros - subsidiaria: " + subsidiaria);

            var informacionCodigosVB = new Array();

            var searchParametrizacionRet = search.load({
                id: "customsearch_l54_parametrizacion_ret"
            });

            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "custrecord_l54_param_ret_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchParametrizacionRet.filters.push(filtroSubsidiaria);
            }

            var resultSearch = searchParametrizacionRet.run();

            var completeResultSet = [];

            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }

                // increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);

            //log.debug("L54 - Calcular Retenciones (SS) - LINE 1311", "completeResultSet.length: " +completeResultSet.length+" - completeResultSet: "+JSON.stringify(completeResultSet));

            if (!isEmpty(completeResultSet)) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    //log.debug("L54 - Calcular Retenciones (SS) - LINE 1316", "INDICE: " +i);
                    informacionCodigosVB[i] = new Object();
                    informacionCodigosVB[i].codigo = 0;
                    informacionCodigosVB[i].importe_factura_pagar = 0;
                    informacionCodigosVB[i].imp_retenido_anterior = 0;
                    informacionCodigosVB[i].base_calculo_retencion = 0;
                    informacionCodigosVB[i].base_calculo_retencion_impresion = 0;
                    informacionCodigosVB[i].importe_retencion = 0;
                    informacionCodigosVB[i].esFacturaM = true;
                    informacionCodigosVB[i].baseCalculoAnualizada = false;
                    informacionCodigosVB[i].esRetManual = false;
                    informacionCodigosVB[i].esGananciaExterior = false;

                    informacionCodigosVB[i].codigo = completeResultSet[i].getValue({
                        name: resultSearch.columns[0]
                    });
                    informacionCodigosVB[i].tipo_ret = completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    });
                    informacionCodigosVB[i].retencionM = completeResultSet[i].getValue({
                        name: resultSearch.columns[3]
                    });
                    informacionCodigosVB[i].minNoImponible = parseFloat(completeResultSet[i].getValue({
                        name: resultSearch.columns[4]
                    }), 10).toFixedOK(2);
                    informacionCodigosVB[i].ganMonotributo = completeResultSet[i].getValue({
                        name: resultSearch.columns[5]
                    });
                    informacionCodigosVB[i].desRetencion = completeResultSet[i].getValue({
                        name: resultSearch.columns[6]
                    });
                    informacionCodigosVB[i].codRetencion = completeResultSet[i].getValue({
                        name: resultSearch.columns[7]
                    });
                    informacionCodigosVB[i].baseCalculoAnualizada = completeResultSet[i].getValue({
                        name: resultSearch.columns[8]
                    });
                    informacionCodigosVB[i].esRetManual = completeResultSet[i].getValue({
                        name: resultSearch.columns[9]
                    });
                    informacionCodigosVB[i].esGananciaExterior = completeResultSet[i].getValue({
                        name: resultSearch.columns[10]
                    });
                    informacionCodigosVB[i].tipoContIVA = completeResultSet[i].getValue({
                        name: resultSearch.columns[11]
                    });
                    informacionCodigosVB[i].tipoContSUSS = completeResultSet[i].getValue({
                        name: resultSearch.columns[12]
                    });
                    informacionCodigosVB[i].tipoContGAN = completeResultSet[i].getValue({
                        name: resultSearch.columns[13]
                    });
                    informacionCodigosVB[i].aplicaTotal = completeResultSet[i].getValue({
                        name: resultSearch.columns[14]
                    });
                }
            }
            log.debug("L54 - Calculo Retenciones", "RETURN - informacionCodigosVB[i].codigo: " + informacionCodigosVB.map(function (o) { return o.codigo; }));
            log.audit("L54 - Calculo Retenciones", "FIN - parametrizacionRetenciones");
            return informacionCodigosVB;


        }

        function obtenerTotalesTransacciones(entidad, billsPagar, subsidiaria) {

            var informacionTotalesFacturas = [];

            try {
                log.debug("obtenerTotalesTransacciones", "INICIO - obtenerTotalesTransacciones");
                log.debug("obtenerTotalesTransacciones", "Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria);

                //SAVE SEARCH A EJECUTAR
                var searchCodRet = search.load({
                    id: "customsearch_l54_totales_fact_cal_retenc"
                });

                //FILTRO PROVEEDOR
                if (!isEmpty(entidad)) {
                    var filtroEntidad = search.createFilter({
                        name: "entity",
                        operator: search.Operator.IS,
                        values: entidad
                    });
                    searchCodRet.filters.push(filtroEntidad);
                }

                //FILTRO BILLS A PAGAR
                if (!isEmpty(billsPagar)) {
                    var filtroBillsPagar = search.createFilter({
                        name: "internalid",
                        operator: search.Operator.ANYOF,
                        values: billsPagar
                    });
                    searchCodRet.filters.push(filtroBillsPagar);
                }

                //FILTRO SUBSIDIARIA
                if (!isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "subsidiary",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    searchCodRet.filters.push(filtroSubsidiaria);
                }

                var resultSearch = searchCodRet.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set


                do {

                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them

                } while (!isEmpty(resultado) && resultado.length > 0 && resultado.length == 1000);


                if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                    for (var i = 0; i < completeResultSet.length; i++) {
                        informacionTotalesFacturas[i] = new Object();

                        informacionTotalesFacturas[i].idInterno = completeResultSet[i].getValue({
                            name: resultSearch.columns[1]
                        });//ID INTERNO

                        informacionTotalesFacturas[i].importeTotal = parseFloat(completeResultSet[i].getValue({
                            name: resultSearch.columns[2]
                        }), 10);//IMPORTE TOTAL
                    }
                }
                else {
                    log.debug("obtenerTotalesTransacciones", "obtenerTotalesTransacciones - No se encuentro informacion para las bills recibidas por parametro");
                }

                log.debug("obtenerTotalesTransacciones", "RETURN - informacionTotalesFacturas: " + JSON.stringify(informacionTotalesFacturas));
                log.debug("obtenerTotalesTransacciones", "FIN - obtenerTotalesTransacciones");
            } catch (error) {
                log.error("obtenerTotalesTransacciones", "Error Excepción NetSuite - Detalles: " + error.message);
            }

            return informacionTotalesFacturas;
        }

        //ABRITO: FUNCION QUE OBTIENE LOS CODIGOS DE RETENCION QUE APLICAN LAS BILLS RECIBIDAS POR PARAMETRO - DEVUELVE UN ARRAY
        function obtener_arreglo_codigos_ret_vendorbill(entidad, billsPagar, subsidiaria, esONG) {
            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_arreglo_codigos_ret_vendorbill");
            log.debug("L54 - Calculo Retenciones", "Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria + " - es ONG: " + esONG);

            var informacionCodigosVB = [];

            //SAVE SEARCH A EJECUTAR
            // Si es ONG se invoca al SS que sólo toma en cuenta las líneas con ID IMPUESTO AFIP == 2
            if (!isEmpty(esONG) && (esONG == "T" || esONG)) {
                var searchCodRet = search.load({
                    id: "customsearch_l54_bill_cod_ret_emp_ong"
                });
            } else { // Si no es ONG se invoca al SS que no toma en cuenta las líneas con ID IMPUESTO AFIP == 3
                var searchCodRet = search.load({
                    id: "customsearch_l54_bill_cod_ret"
                });
            }

            //FILTRO PROVEEDOR
            if (!isEmpty(entidad)) {
                var filtroEntidad = search.createFilter({
                    name: "entity",
                    operator: search.Operator.IS,
                    values: entidad
                });
                searchCodRet.filters.push(filtroEntidad);
            }

            //FILTRO BILLS A PAGAR
            if (!isEmpty(billsPagar)) {
                var filtroBillsPagar = search.createFilter({
                    name: "internalid",
                    operator: search.Operator.ANYOF,
                    values: billsPagar
                });
                searchCodRet.filters.push(filtroBillsPagar);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchCodRet.filters.push(filtroSubsidiaria);
            }

            var resultSearch = searchCodRet.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);


            if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    informacionCodigosVB[i] = new Object();

                    informacionCodigosVB[i].idInterno = completeResultSet[i].getValue({
                        name: resultSearch.columns[1]
                    });//ID INTERNO

                    informacionCodigosVB[i].importeTotal = parseFloat(completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    }), 10);//IMPORTE TOTAL

                    informacionCodigosVB[i].codigoRetGanancias = completeResultSet[i].getValue({
                        name: resultSearch.columns[3]
                    });//CODIGO RETENCION GANANCIAS

                    informacionCodigosVB[i].codigoRetIVA = completeResultSet[i].getValue({
                        name: resultSearch.columns[4]
                    });//CODIGO RETENCION IVA

                    informacionCodigosVB[i].codigoRetSUSS = completeResultSet[i].getValue({
                        name: resultSearch.columns[5]
                    });//CODIGO RETENCION SUSS

                    informacionCodigosVB[i].esFacturaM = completeResultSet[i].getValue({
                        name: resultSearch.columns[6]
                    });//INDICA SI ES UNA TRANSACCION M

                    informacionCodigosVB[i].calcularSobreIVA = completeResultSet[i].getValue({
                        name: resultSearch.columns[8]
                    });//INDICA SI LA BASE DE CÁLCULO SE CALCULA SOBRE IVA

                    informacionCodigosVB[i].nombreRetGanancias = completeResultSet[i].getValue({
                        name: resultSearch.columns[9]
                    });//INDICA EL NOMBRE DE LA RETENCIÓN DE GANANCIAS

                    informacionCodigosVB[i].nombreRetSUSS = completeResultSet[i].getValue({
                        name: resultSearch.columns[10]
                    });//INDICA EL NOMBRE DE LA RETENCIÓN DE SUSS

                    informacionCodigosVB[i].nombreRetIVA = completeResultSet[i].getValue({
                        name: resultSearch.columns[11]
                    });//INDICA EL NOMBRE DE LA RETENCIÓN DE IVA

                    informacionCodigosVB[i].esFacturaAliados = completeResultSet[i].getValue({
                        name: resultSearch.columns[12]
                    });//ES FACTURA DE ALIADOS?

                    informacionCodigosVB[i].referenceNumberTransaction = completeResultSet[i].getValue({
                        name: resultSearch.columns[13]
                    });//REFERENCE NUMBER

                }
            }
            else {
                log.error("L54 - Calculo Retenciones", "obtener_arreglo_codigos_ret_vendorbill - No se encuentro informacion para las bills recibidas por parametro");
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - informacionCodigosVB: " + JSON.stringify(informacionCodigosVB));
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_arreglo_codigos_ret_vendorbill");
            return informacionCodigosVB;
        }

        //JSALAZAR: FUNCION QUE OBTIENE LOS CODIGOS DE RETENCION QUE APLICAN LAS BILLS RECIBIDAS POR PARAMETRO EN MONEDA LOCAL - DEVUELVE UN ARRAY
        function obtener_arreglo_codigos_ret_vendorbill_moneda_local(entidad, billsPagar, subsidiaria, esONG) {
            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_arreglo_codigos_ret_vendorbill_moneda_local");
            log.debug("L54 - Calculo Retenciones", "Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria + " - es ONG: " + esONG);

            var informacionCodigosVB = [];

            //SAVE SEARCH A EJECUTAR
            // Si es ONG se invoca al SS que sólo toma en cuenta las líneas con ID IMPUESTO AFIP == 2
            if (!isEmpty(esONG) && (esONG == "T" || esONG)) {
                var searchCodRet = search.load({
                    id: "customsearch_l54_bill_cod_ret_em_ong_m_l"
                });
            } else { // Si no es ONG se invoca al SS que no toma en cuenta las líneas con ID IMPUESTO AFIP == 3
                var searchCodRet = search.load({
                    id: "customsearch_l54_bill_cod_ret_mon_local"
                });
            }

            //FILTRO PROVEEDOR
            if (!isEmpty(entidad)) {
                var filtroEntidad = search.createFilter({
                    name: "entity",
                    operator: search.Operator.IS,
                    values: entidad
                });
                searchCodRet.filters.push(filtroEntidad);
            }

            //FILTRO BILLS A PAGAR
            if (!isEmpty(billsPagar)) {
                var filtroBillsPagar = search.createFilter({
                    name: "internalid",
                    operator: search.Operator.ANYOF,
                    values: billsPagar
                });
                searchCodRet.filters.push(filtroBillsPagar);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchCodRet.filters.push(filtroSubsidiaria);
            }

            var resultSearch = searchCodRet.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);


            if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    informacionCodigosVB[i] = new Object();

                    informacionCodigosVB[i].idInterno = completeResultSet[i].getValue({
                        name: resultSearch.columns[1]
                    });//ID INTERNO

                    informacionCodigosVB[i].importeTotal = parseFloat(completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    }), 10);//IMPORTE TOTAL

                    informacionCodigosVB[i].codigoRetGanancias = completeResultSet[i].getValue({
                        name: resultSearch.columns[3]
                    });//CODIGO RETENCION GANANCIAS

                    informacionCodigosVB[i].codigoRetIVA = completeResultSet[i].getValue({
                        name: resultSearch.columns[4]
                    });//CODIGO RETENCION IVA

                    informacionCodigosVB[i].codigoRetSUSS = completeResultSet[i].getValue({
                        name: resultSearch.columns[5]
                    });//CODIGO RETENCION SUSS

                    informacionCodigosVB[i].esFacturaM = completeResultSet[i].getValue({
                        name: resultSearch.columns[6]
                    });//INDICA SI ES UNA TRANSACCION M

                    informacionCodigosVB[i].calcularSobreIVA = completeResultSet[i].getValue({
                        name: resultSearch.columns[8]
                    });//INDICA SI LA BASE DE CÁLCULO SE CALCULA SOBRE IVA

                    informacionCodigosVB[i].nombreRetGanancias = completeResultSet[i].getValue({
                        name: resultSearch.columns[9]
                    });//INDICA EL NOMBRE DE LA RETENCIÓN DE GANANCIAS

                    informacionCodigosVB[i].nombreRetSUSS = completeResultSet[i].getValue({
                        name: resultSearch.columns[10]
                    });//INDICA EL NOMBRE DE LA RETENCIÓN DE SUSS

                    informacionCodigosVB[i].nombreRetIVA = completeResultSet[i].getValue({
                        name: resultSearch.columns[11]
                    });//INDICA EL NOMBRE DE LA RETENCIÓN DE IVA
                }
            }
            else {
                log.error("L54 - Calculo Retenciones", "obtener_arreglo_codigos_ret_vendorbill_moneda_local - No se encuentro informacion para las bills recibidas por parametro");
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - informacionCodigosVB: " + JSON.stringify(informacionCodigosVB));
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_arreglo_codigos_ret_vendorbill_moneda_local");
            return informacionCodigosVB;
        }

        //ABRITO: FUNCION QUE OBTIENE LOS IMPORTES NETOS DE LAS BILLS - DEVUELVE UN ARRAY
        function obtener_arreglo_netos_vendorbill(entidad, billsPagar, subsidiaria, sinJurisdiccionUnica, esONG) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_arreglo_netos_vendorbill");
            log.debug("L54 - Calculo Retenciones", "Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria + " - sinJurisdiccionUnica: " + sinJurisdiccionUnica + " - esONG: " + esONG);

            var informacionNetosVB = [];

            //SAVE SEARCH A EJECUTAR
            // Si es ONG se invoca al SS que sólo toma en cuenta las líneas con ID IMPUESTO AFIP == 2
            if (!isEmpty(esONG) && (esONG == "T" || esONG)) {
                var searchNetosVB = search.load({
                    id: "customsearch_l54_bill_net_amt_emp_ong"
                });
            } else { // Si no es ONG se invoca al SS que no toma en cuenta las líneas con ID IMPUESTO AFIP == 3
                var searchNetosVB = search.load({
                    id: "customsearch_l54_bill_net_amt"
                });
            }

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_arreglo_netos_vendorbill - searchnetosvb: " + JSON.stringify(searchNetosVB));

            //FILTRO PROVEEDOR
            if (!isEmpty(entidad)) {
                var filtroEntidad = search.createFilter({
                    name: "entity",
                    operator: search.Operator.IS,
                    values: entidad
                });
                searchNetosVB.filters.push(filtroEntidad);
            }

            //FILTRO BILLS A PAGAR
            if (!isEmpty(billsPagar)) {
                var filtroBillsPagar = search.createFilter({
                    name: "internalid",
                    operator: search.Operator.ANYOF,
                    values: billsPagar
                });
                searchNetosVB.filters.push(filtroBillsPagar);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchNetosVB.filters.push(filtroSubsidiaria);
            }

            if (sinJurisdiccionUnica) {
                var filtroJurisdiccionUnica = search.createFilter({
                    name: "custbody_l54_jurisdiccion_unica",
                    operator: search.Operator.ANYOF,
                    values: "@NONE@"
                });
                searchNetosVB.filters.push(filtroJurisdiccionUnica);
            }

            var resultSearch = searchNetosVB.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);


            if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    informacionNetosVB[i] = new Object();

                    informacionNetosVB[i].idInterno = completeResultSet[i].getValue({
                        name: resultSearch.columns[1]
                    });//ID INTERNO BILL

                    informacionNetosVB[i].importe = parseFloat(completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    }), 10);//IMPORTE NETO

                    informacionNetosVB[i].jurisdiccionEntregaID = completeResultSet[i].getValue({
                        name: resultSearch.columns[3]
                    });//L54 - Jurisdicción Entrega

                    informacionNetosVB[i].jurisdiccionEntregaCodigo = completeResultSet[i].getValue({
                        name: resultSearch.columns[4]
                    });//L54 - Jurisdicción Entrega - Código Jurisdicción

                    informacionNetosVB[i].jurisdiccionEntregaNombre = completeResultSet[i].getValue({
                        name: resultSearch.columns[5]
                    });//L54 - Jurisdicción Entrega - Nombre

                    informacionNetosVB[i].calcRetNoInscJurEnt = convertToBoolean(completeResultSet[i].getValue({
                        name: resultSearch.columns[6]
                    }));//L54 - Jurisdicción Entrega -  CÁLCULO POR JURISD. ENTREGA NO INSCRIPTOS (RETENCIONES)
                }
            } else {
                log.error("L54 - Calculo Retenciones", "obtener_arreglo_netos_vendorbill - No se encuentro informacion para las bills recibidas por parametro");
            }
            log.debug("L54 - Calculo Retenciones", "RETURN - informacionNetosVB: " + JSON.stringify(informacionNetosVB));
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_arreglo_netos_vendorbill");
            return informacionNetosVB;
        }

        function convertToBoolean(string) {

            return ((isEmpty(string) || string == "F" || string == false) ? false : true);
        }

        //JSALAZAR: FUNCION QUE PERMITE OBTENER LOS IMPORTES NETOS DE LAS BILLS EN SU MONEDA LOCAL - DEVUELVE UN ARRAY
        function obtener_arreglo_netos_vendorbill_moneda_local(entidad, billsPagar, subsidiaria, sinJurisdiccionUnica, esONG) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_arreglo_netos_vendorbill_moneda_local");
            log.debug("L54 - Calculo Retenciones", "Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria + " - sinJurisdiccionUnica: " + sinJurisdiccionUnica + " - esONG: " + esONG);

            var informacionNetosVB = [];

            //SAVE SEARCH A EJECUTAR
            // Si es ONG se invoca al SS que sólo toma en cuenta las líneas con ID IMPUESTO AFIP == 2
            if (!isEmpty(esONG) && (esONG == "T" || esONG)) {
                var searchNetosVB = search.load({
                    id: "customsearch_l54_bill_net_amt_em_ong_m_l"
                });
            } else { // Si no es ONG se invoca al SS que no toma en cuenta las líneas con ID IMPUESTO AFIP == 3
                var searchNetosVB = search.load({
                    id: "customsearch_l54_bill_net_amt_mon_local"
                });
            }

            //log.audit("L54 - Calculo Retenciones", "INICIO - obtener_arreglo_netos_vendorbill - searchnetosvb: " + JSON.stringify(searchNetosVB));

            //FILTRO PROVEEDOR
            if (!isEmpty(entidad)) {
                var filtroEntidad = search.createFilter({
                    name: "entity",
                    operator: search.Operator.IS,
                    values: entidad
                });
                searchNetosVB.filters.push(filtroEntidad);
            }

            //FILTRO BILLS A PAGAR
            if (!isEmpty(billsPagar)) {
                var filtroBillsPagar = search.createFilter({
                    name: "internalid",
                    operator: search.Operator.ANYOF,
                    values: billsPagar
                });
                searchNetosVB.filters.push(filtroBillsPagar);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchNetosVB.filters.push(filtroSubsidiaria);
            }

            if (sinJurisdiccionUnica) {
                var filtroJurisdiccionUnica = search.createFilter({
                    name: "custbody_l54_jurisdiccion_unica",
                    operator: search.Operator.ANYOF,
                    values: "@NONE@"
                });
                searchNetosVB.filters.push(filtroJurisdiccionUnica);
            }

            var resultSearch = searchNetosVB.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);


            if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    informacionNetosVB[i] = new Object();

                    informacionNetosVB[i].idInterno = completeResultSet[i].getValue({
                        name: resultSearch.columns[1]
                    });//ID INTERNO BILL

                    informacionNetosVB[i].importe = parseFloat(completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    }), 10);//IMPORTE NETO
                }
            }
            else {
                log.error("L54 - Calculo Retenciones", "obtener_arreglo_netos_vendorbill_moneda_local - No se encuentro informacion para las bills recibidas por parametro");
            }
            log.debug("L54 - Calculo Retenciones", "RETURN - informacionNetosVB: " + JSON.stringify(informacionNetosVB));
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_arreglo_netos_vendorbill_moneda_local");
            return informacionNetosVB;
        }

        //ABRITO: FUNCION QUE OBTIENE LOS IMPORTES PERCIBIDOS DE LAS BILLS - DEVUELVE UN ARRAY
        function obtener_arreglo_imp_perc(entidad, billsPagar, subsidiaria) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_arreglo_imp_perc");
            log.debug("L54 - Calculo Retenciones", "Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria);

            var informacionImpPercVB = new Array();

            //SAVE SEARCH A EJECUTAR
            var searchImpPerc = search.load({
                id: "customsearch_l54_imp_perc"
            });

            //FILTRO PROVEEDOR
            if (!isEmpty(entidad)) {
                var filtroEntidad = search.createFilter({
                    name: "entity",
                    operator: search.Operator.IS,
                    values: entidad
                });
                searchImpPerc.filters.push(filtroEntidad);
            }

            //FILTRO BILLS A PAGAR
            if (!isEmpty(billsPagar)) {
                var filtroBillsPagar = search.createFilter({
                    name: "internalid",
                    operator: search.Operator.ANYOF,
                    values: billsPagar
                });
                searchImpPerc.filters.push(filtroBillsPagar);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchImpPerc.filters.push(filtroSubsidiaria);
            }

            var resultSearch = searchImpPerc.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);


            if (!isEmpty(completeResultSet)) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    informacionImpPercVB[i] = new Object();

                    informacionImpPercVB[i].idInterno = completeResultSet[i].getValue({
                        name: resultSearch.columns[1]
                    });//ID INTERNO BILL

                    informacionImpPercVB[i].importe = parseFloat(completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    }), 10);//IMPORTE NETO
                }
            }
            else {
                log.error("L54 - Calculo Retenciones", "obtener_arreglo_imp_perc - No se encuentro informacion para las bills recibidas por parametro");
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - informacionImpPercVB: " + JSON.stringify(informacionImpPercVB));
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_arreglo_imp_perc");
            return informacionImpPercVB;
        }

        //ABRITO: FUNCION QUE OBTIENE LOS IMPORTES DE IVA DE LAS BILLS - DEVUELVE UN ARRAY
        function obtener_arreglo_iva_vendorbill(entidad, billsPagar, subsidiaria, esONG) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_arreglo_iva_vendorbill");
            log.debug("L54 - Calculo Retenciones", "Parámetros - obtener_arreglo_iva_vendorbill - Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria + " - esONG: " + esONG);

            var informacionIVAVB = new Array();

            //SAVE SEARCH A EJECUTAR
            // Si es ONG se invoca al SS que sólo toma en cuenta las líneas con ID IMPUESTO AFIP == 2
            if (!isEmpty(esONG) && (esONG == "T" || esONG)) {
                var searchImpIVA = search.load({
                    id: "customsearch_l54_imp_iva_emp_ong"
                });
            } else { // Si no es ONG se invoca al SS que no toma en cuenta las líneas con ID IMPUESTO AFIP == 3
                var searchImpIVA = search.load({
                    id: "customsearch_l54_imp_iva"
                });
            }

            //FILTRO PROVEEDOR
            if (!isEmpty(entidad)) {
                var filtroEntidad = search.createFilter({
                    name: "entity",
                    operator: search.Operator.IS,
                    values: entidad
                });
                searchImpIVA.filters.push(filtroEntidad);
            }

            //FILTRO BILLS A PAGAR
            if (!isEmpty(billsPagar)) {
                var filtroBillsPagar = search.createFilter({
                    name: "internalid",
                    operator: search.Operator.ANYOF,
                    values: billsPagar
                });
                searchImpIVA.filters.push(filtroBillsPagar);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchImpIVA.filters.push(filtroSubsidiaria);
            }

            var resultSearch = searchImpIVA.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);


            if (!isEmpty(completeResultSet)) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    informacionIVAVB[i] = new Object();

                    informacionIVAVB[i].idInterno = completeResultSet[i].getValue({
                        name: resultSearch.columns[1]
                    });//ID INTERNO BILL

                    informacionIVAVB[i].importe = parseFloat(completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    }), 10);//IMPORTE NETO
                }
            }
            else {
                log.error("L54 - Calculo Retenciones", "obtener_arreglo_iva_vendorbill - No se encuentro informacion para las bills recibidas por parametro");
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - informacionIVAVB: " + JSON.stringify(informacionIVAVB));
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_arreglo_iva_vendorbill");
            return informacionIVAVB;
        }

        /* JSALAZAR: 08/12/2019: SE EXTRAE EL TOTAL DE IMPORTE PAGADO PARA UNA FACTURA EN TODAS LAS VENDOR PAYMENTS QUE SE VINCULÓ ANTES DEL PERIODO DE CALCULO (MENSUAL O ANUAL)
        NO TOMA EN CUENTA LAS DEL PERIODO ACTUAL */
        function calcularImportesBrutosPagosPasados(entidad, billsPagar, subsidiaria, fecha_pago, esAnualizada) {

            try {
                log.audit("L54 - Calculo Retenciones", "INICIO - calcularImportesBrutosPagosPasados");
                log.debug("L54 - Calculo Retenciones", "Parámetros - calcularImportesBrutosPagosPasados - Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria + " - fecha_pago: " + fecha_pago + " - esAnualizada: " + esAnualizada);

                var informacionPagoPasadosFactura = [];


                var searchTotalPagosPasadosFacturas = search.load({
                    id: "customsearch_l54_tot_pag_pas_fac_cal_ret"
                });

                //FILTRO PROVEEDOR
                if (!isEmpty(entidad)) {
                    var filtroEntidad = search.createFilter({
                        name: "entity",
                        operator: search.Operator.IS,
                        values: entidad
                    });
                    searchTotalPagosPasadosFacturas.filters.push(filtroEntidad);
                }

                //FILTRO BILLS A PAGAR
                if (!isEmpty(billsPagar)) {
                    var filtroBillsPagar = search.createFilter({
                        name: "internalid",
                        operator: search.Operator.ANYOF,
                        values: billsPagar
                    });
                    searchTotalPagosPasadosFacturas.filters.push(filtroBillsPagar);
                }

                //FILTRO SUBSIDIARIA
                if (!isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "subsidiary",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    searchTotalPagosPasadosFacturas.filters.push(filtroSubsidiaria);
                }

                //FILTRO PERIODO O FECHAS
                if (!isEmpty(fecha_pago)) {

                    /* var trandateDate = format.parse({
                        value: fecha_pago,
                        type: format.Type.DATE,
                        timezone: format.Timezone.AMERICA_BUENOS_AIRES // Montevideo - Uruguay
                    }); */

                    var trandateDate = fecha_pago;

                    var dia = trandateDate.getDate();
                    var mes = trandateDate.getMonth();
                    var anio = trandateDate.getFullYear();
                    var trandateDate = new Date(anio, mes, dia);

                    var fechaInicial = new Date(anio, mes, dia); // ver de poner la fecha actual o la fecha de la transacción
                    fechaInicial.setDate(1);

                    if (esAnualizada) {
                        //fechaInicial.setMonth(fechaInicial.getMonth() - 11);
                        fechaInicial.setMonth(0);
                    }

                    var fechaInicialAUX = format.format({
                        value: fechaInicial,
                        type: format.Type.DATE,
                        timezone: format.Timezone.AMERICA_BUENOS_AIRES
                    });

                    //FILTRO FECHA HASTA
                    if (!isEmpty(fechaInicialAUX)) {

                        var filtroFechaHasta = search.createFilter({
                            name: "trandate",
                            join: "payingtransaction",
                            operator: search.Operator.BEFORE,
                            values: fechaInicialAUX
                        });
                        searchTotalPagosPasadosFacturas.filters.push(filtroFechaHasta);
                    }
                }

                var resultSearch = searchTotalPagosPasadosFacturas.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!isEmpty(resultado) && resultado.length > 0);


                if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                    for (var i = 0; i < completeResultSet.length; i++) {
                        informacionPagoPasadosFactura[i] = new Object();

                        informacionPagoPasadosFactura[i].idInterno = completeResultSet[i].getValue({
                            name: resultSearch.columns[0]
                        });//ID INTERNO BILL

                        informacionPagoPasadosFactura[i].importe = parseFloat(completeResultSet[i].getValue({
                            name: resultSearch.columns[1]
                        }), 10);//IMPORTE BRUTO PAGADO
                    }
                }
                else {
                    log.debug("L54 - Calculo Retenciones", "calcularImportesBrutosPagosPasados - No se encuentro informacion de importes para las bills recibidas por parametro");
                }

                log.debug("L54 - Calculo Retenciones", "RETURN - informacionPagoPasadosFactura: " + JSON.stringify(informacionPagoPasadosFactura));
                log.audit("L54 - Calculo Retenciones", "FIN - calcularImportesBrutosPagosPasados");
                return informacionPagoPasadosFactura;
            } catch (e) {
                log.error("calcularImportesBrutosPagosPasados", "Error - calcularImportesBrutosPagosPasados - Excepcion Error: " + e.message);
            }
        }

        //JSALAZAR: 08/12/2019: SE EXTRAE EL TOTAL DE IMPORTE BRUTO PARA LAS FACTURA QUE HAN SIDO PAGADAS ANTES DEL PAGO ACTUAL - TOMANDO EN CUENTA LAS DEL PERIODO ACTUAL Y LAS ANTERIORES
        function calcularImpBrutosPagPasadosTotalesAcumulados(entidad, billsPagar, subsidiaria, fecha_pago) {

            try {
                log.audit("L54 - Calculo Retenciones", "INICIO - calcularImpBrutosPagPasadosTotalesAcumulados");
                log.debug("L54 - Calculo Retenciones", "Parámetros - calcularImpBrutosPagPasadosTotalesAcumulados - Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria + " - fecha_pago: " + fecha_pago);

                var informacionPagoPasadosFacturaAcumulado = [];

                //SAVE SEARCH A EJECUTAR
                var searchTotalPagosPasadosFacturasAcumulado = search.load({
                    id: "customsearch_l54_tot_pag_pas_fac_ac_c_r"
                });

                //FILTRO PROVEEDOR
                if (!isEmpty(entidad)) {
                    var filtroEntidad = search.createFilter({
                        name: "entity",
                        operator: search.Operator.IS,
                        values: entidad
                    });
                    searchTotalPagosPasadosFacturasAcumulado.filters.push(filtroEntidad);
                }

                //FILTRO BILLS A PAGAR
                if (!isEmpty(billsPagar)) {
                    var filtroBillsPagar = search.createFilter({
                        name: "internalid",
                        operator: search.Operator.ANYOF,
                        values: billsPagar
                    });
                    searchTotalPagosPasadosFacturasAcumulado.filters.push(filtroBillsPagar);
                }

                //FILTRO SUBSIDIARIA
                if (!isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "subsidiary",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    searchTotalPagosPasadosFacturasAcumulado.filters.push(filtroSubsidiaria);
                }

                //FILTRO PERIODO O FECHAS
                if (!isEmpty(fecha_pago)) {

                    /* var trandateDate = format.parse({
                        value: fecha_pago,
                        type: format.Type.DATE,
                        timezone: format.Timezone.AMERICA_BUENOS_AIRES // Montevideo - Uruguay
                    }); */

                    var trandateDate = fecha_pago;

                    var dia = trandateDate.getDate();
                    var mes = trandateDate.getMonth();
                    var anio = trandateDate.getFullYear();
                    var trandateDate = new Date(anio, mes, dia);

                    var fechaInicial = new Date(anio, mes, dia); // ver de poner la fecha actual o la fecha de la transacción

                    var fechaInicialAUX = format.format({
                        value: fechaInicial,
                        type: format.Type.DATE,
                        timezone: format.Timezone.AMERICA_BUENOS_AIRES
                    });

                    //FILTRO FECHA
                    if (!isEmpty(fechaInicialAUX)) {

                        var filtroFechaDesde = search.createFilter({
                            name: "trandate",
                            join: "payingtransaction",
                            operator: search.Operator.ONORBEFORE,
                            values: fechaInicialAUX
                        });
                        searchTotalPagosPasadosFacturasAcumulado.filters.push(filtroFechaDesde);
                    }
                }

                var resultSearch = searchTotalPagosPasadosFacturasAcumulado.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!isEmpty(resultado) && resultado.length > 0);


                if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                    for (var i = 0; i < completeResultSet.length; i++) {
                        informacionPagoPasadosFacturaAcumulado[i] = new Object();

                        informacionPagoPasadosFacturaAcumulado[i].idInterno = completeResultSet[i].getValue({
                            name: resultSearch.columns[0]
                        });//ID INTERNO BILL

                        informacionPagoPasadosFacturaAcumulado[i].importe = parseFloat(completeResultSet[i].getValue({
                            name: resultSearch.columns[1]
                        }), 10);//IMPORTE BRUTO PAGADO

                        informacionPagoPasadosFacturaAcumulado[i].pagosAsociados = (completeResultSet[i].getValue({
                            name: resultSearch.columns[5]
                        })).split(",");//Pagos asociados
                    }
                }
                else {
                    log.debug("L54 - Calculo Retenciones", "calcularImpBrutosPagPasadosTotalesAcumulados - No se encuentro informacion de importes para las bills recibidas por parametro");
                }

                log.debug("L54 - Calculo Retenciones", "RETURN - informacionPagoPasadosFacturaAcumulado: " + JSON.stringify(informacionPagoPasadosFacturaAcumulado));
                log.audit("L54 - Calculo Retenciones", "FIN - calcularImpBrutosPagPasadosTotalesAcumulados");
                return informacionPagoPasadosFacturaAcumulado;
            } catch (e) {
                log.error("calcularImpBrutosPagPasadosTotalesAcumulados", "Error - calcularImpBrutosPagPasadosTotalesAcumulados - Excepcion Error: " + e.message);
            }
        }

        function obtener_imp_factura_pasado_pagada(arregloPagosFact, idVendorBill) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_imp_factura_pasado_pagada");
            log.debug("L54 - Calculo Retenciones", "Parámetros - arregloPagosFact: " + JSON.stringify(arregloPagosFact) + ", idVendorBill: " + idVendorBill);

            var bruto_pagado_bill = 0;

            var resultBill = arregloPagosFact.filter(function (obj) {
                return obj.idInterno == idVendorBill;
            });

            if (!isEmpty(resultBill) && resultBill.length > 0) {
                bruto_pagado_bill = parseFloat(resultBill[0].importe, 10);
            }
            else {
                log.debug("L54 - Calcular Retenciones (SS)", "obtener_imp_factura_pasado_pagada - No se encuentro informacion para las bills recibidas por parametro");
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - bruto_pagado_bill: " + bruto_pagado_bill);
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_imp_factura_pasado_pagada");
            return bruto_pagado_bill;
        }

        function obtener_neto_vendorbill(arregloNetosVendorBill, idVendorBill) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_neto_vendorbill");
            log.debug("L54 - Calculo Retenciones", "Parámetros - arregloNetosVendorBill: " + JSON.stringify(arregloNetosVendorBill) + ", idVendorBill: " + idVendorBill);

            var neto_vendorbill = 0;

            var resultVendorBill = arregloNetosVendorBill.filter(function (obj) {
                return obj.idInterno == idVendorBill;
            });

            if (!isEmpty(resultVendorBill) && resultVendorBill.length > 0) {
                neto_vendorbill = parseFloat(resultVendorBill[0].importe, 10);
            }
            else {
                log.error("L54 - Calcular Retenciones (SS)", "obtener_neto_vendorbill - No se encuentro informacion para las bills recibidas por parametro");
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - neto_vendorbill: " + neto_vendorbill);
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_neto_vendorbill");
            return neto_vendorbill;
        }

        function obtener_neto_(arregloNetosVendorBill, idVendorBill) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_neto_vendorbill");
            log.debug("L54 - Calculo Retenciones", "Parámetros - arregloNetosVendorBill: " + JSON.stringify(arregloNetosVendorBill) + ", idVendorBill: " + idVendorBill);

            var neto_vendorbill = 0;

            var resultVendorBill = arregloNetosVendorBill.filter(function (obj) {
                return obj.idInterno == idVendorBill;
            });

            if (!isEmpty(resultVendorBill) && resultVendorBill.length > 0) {
                neto_vendorbill = parseFloat(resultVendorBill[0].importe, 10);
            }
            else {
                log.error("L54 - Calcular Retenciones (SS)", "obtener_neto_vendorbill - No se encuentro informacion para las bills recibidas por parametro");
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - neto_vendorbill: " + neto_vendorbill);
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_neto_vendorbill");
            return neto_vendorbill;
        }

        function obtener_importe_percepcion(arregloImpPerc, idVendorBill) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_importe_percepcion");
            log.debug("L54 - Calculo Retenciones", "Parámetros - arregloImpPerc: " + JSON.stringify(arregloImpPerc) + ", idVendorBill: " + idVendorBill);

            var imp_perc = 0;

            var resultImpPercepcion = arregloImpPerc.filter(function (obj) {
                return obj.idInterno == idVendorBill;
            });

            if (!isEmpty(resultImpPercepcion) && resultImpPercepcion.length > 0) {
                imp_perc = parseFloat(resultImpPercepcion[0].importe, 10);
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - imp_perc: " + imp_perc);
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_importe_percepcion");
            return imp_perc;
        }

        function obtenerTotalesFinalesTransaccion(resultsTotalesBills, idVendorBill) {

            log.audit("obtenerTotalesFinalesTransaccion", "INICIO - obtenerTotalesFinalesTransaccion");
            log.debug("obtenerTotalesFinalesTransaccion", "Parámetros - resultsTotalesBills: " + JSON.stringify(resultsTotalesBills) + ", idVendorBill: " + idVendorBill);

            var resultFactura = new Object();
            resultFactura.importeTotal = 0.00;

            if (resultsTotalesBills != null && resultsTotalesBills.length > 0 && !isEmpty(idVendorBill)) {

                var result = resultsTotalesBills.filter(function (obj) {
                    return (obj.idInterno === idVendorBill);
                });

                if (!isEmpty(result) && result.length > 0) {
                    resultFactura.importeTotal = result[0].importeTotal;
                }
            }

            log.debug("obtenerTotalesFinalesTransaccion", "RETURN - resultFactura: " + JSON.stringify(resultFactura));
            log.audit("obtenerTotalesFinalesTransaccion", "FIN - obtenerTotalesFinalesTransaccion");
            return resultFactura;
        }

        function obtener_codigos_vendorbill(arregloCodigosVendorBill, idVendorBill) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_codigos_vendorbill");
            log.debug("L54 - Calculo Retenciones", "Parámetros - arregloCodigosVendorBill: " + JSON.stringify(arregloCodigosVendorBill) + ", idVendorBill: " + idVendorBill);

            var resultadoCodigos = new Object();
            resultadoCodigos.codigoRetGanancias = "";
            resultadoCodigos.codigoRetIVA = "";
            resultadoCodigos.codigoRetSUSS = "";
            resultadoCodigos.importeTotal = 0.00;
            resultadoCodigos.esFacturaM = false;

            if (arregloCodigosVendorBill != null && arregloCodigosVendorBill.length > 0 && !isEmpty(idVendorBill)) {

                var resultadoCodigosRetencion = arregloCodigosVendorBill.filter(function (obj) {
                    return obj.idInterno === idVendorBill;
                });

                if (!isEmpty(resultadoCodigosRetencion) && resultadoCodigosRetencion.length > 0) {
                    resultadoCodigos.importeTotal = resultadoCodigosRetencion[0].importeTotal;
                    resultadoCodigos.codigoRetGanancias = resultadoCodigosRetencion[0].codigoRetGanancias;
                    resultadoCodigos.codigoRetIVA = resultadoCodigosRetencion[0].codigoRetIVA;
                    resultadoCodigos.codigoRetSUSS = resultadoCodigosRetencion[0].codigoRetSUSS;
                    resultadoCodigos.esFacturaM = resultadoCodigosRetencion[0].esFacturaM;
                    resultadoCodigos.calcularSobreIVA = resultadoCodigosRetencion[0].calcularSobreIVA;
                    resultadoCodigos.nombreRetGanancias = resultadoCodigosRetencion[0].nombreRetGanancias;
                    resultadoCodigos.nombreRetSUSS = resultadoCodigosRetencion[0].nombreRetSUSS;
                    resultadoCodigos.nombreRetIVA = resultadoCodigosRetencion[0].nombreRetIVA;
                    resultadoCodigos.esFacturaAliados = resultadoCodigosRetencion[0].esFacturaAliados;
                }
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - resultadoCodigos: " + JSON.stringify(resultadoCodigos));
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_codigos_vendorbill");
            return resultadoCodigos;
        }

        function obtener_iva_vendorbill(arregloIVAVendorBill, idVendorBill) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_iva_vendorbill");
            log.debug("L54 - Calculo Retenciones", "Parámetros - arregloIVAVendorBill: " + JSON.stringify(arregloIVAVendorBill) + ", idVendorBill: " + idVendorBill);

            var resultadoIVA = new Object();
            resultadoIVA.importeIVA = 0.00;

            if (arregloIVAVendorBill != null && arregloIVAVendorBill.length > 0 && !isEmpty(idVendorBill)) {

                var resultadoInfoIVA = arregloIVAVendorBill.filter(function (obj) {
                    return obj.idInterno === idVendorBill;
                });

                if (!isEmpty(resultadoInfoIVA) && resultadoInfoIVA.length > 0) {
                    resultadoIVA.importeIVA = resultadoInfoIVA[0].importe;
                }
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - resultadoIVA: " + JSON.stringify(resultadoIVA));
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_iva_vendorbill");
            return resultadoIVA;
        }

        /*ABRITO 09/11/2018
        2014 - En caso de no exisitir el codigo de retencion en el vector de retenciones, agrega el codigo de retencion con el importe a pagar de la Factura.
        Si el codigo de Retencion ya existe en el vector, Suma el nuevo importe a pagar de la Factura
         */
        function agregarCodigoRetencion(objRetencion, codigo_retencion, importe_a_pagar, esFacturaM, impNetoFactura, calcularSobreIVA, nombreRetencion, esRetManual) {

            log.audit("L54 - Calculo Retenciones", "INICIO - agregarCodigoRetencion");
            log.debug("L54 - Calculo Retenciones", "Parámetros - objRetencion: " + JSON.stringify(objRetencion) + ", codigo_retencion: " + codigo_retencion + ", importe_a_pagar: " + importe_a_pagar + ", esFacturaM: " + esFacturaM + ", impNetoFactura: " + impNetoFactura + " - nombreRetencion: " + nombreRetencion + " - esRetManual: " + esRetManual);

            if (objRetencion != null) {
                if (objRetencion.length > 0) {
                    var codigoEncontrado = false;
                    // Busco si ya esta asociado el codigo de retencion
                    for (var i = 0; i < objRetencion.length && codigoEncontrado == false; i++) {
                        if (objRetencion[i].codigo == codigo_retencion) {
                            codigoEncontrado = true;
                            objRetencion[i].importe_factura_pagar = parseFloat(objRetencion[i].importe_factura_pagar, 10) + parseFloat(importe_a_pagar, 10);

                            if (parseFloat(countDecimales(objRetencion[i].importe_factura_pagar), 10) > 13) {
                                objRetencion[i].importe_factura_pagar = parseFloat(objRetencion[i].importe_factura_pagar, 10).toFixedOK(2);
                            }
                        }
                    }
                    if (codigoEncontrado == false) {
                        var cantidadElementos = objRetencion.length;
                        // Agrego el Codigo de la Retencion
                        objRetencion[cantidadElementos] = new Object();
                        objRetencion[cantidadElementos].codigo = codigo_retencion;
                        objRetencion[cantidadElementos].importe_factura_pagar = parseFloat(importe_a_pagar, 10);
                        objRetencion[cantidadElementos].imp_retenido_anterior = 0;
                        objRetencion[cantidadElementos].base_calculo_retencion = 0;
                        objRetencion[cantidadElementos].base_calculo_retencion_impresion = 0;
                        objRetencion[cantidadElementos].importe_retencion = 0;
                        objRetencion[cantidadElementos].esFacturaM = esFacturaM;
                        objRetencion[cantidadElementos].imp_neto_factura = parseFloat(impNetoFactura, 10);
                        objRetencion[cantidadElementos].calcularSobreIVA = calcularSobreIVA;
                        objRetencion[cantidadElementos].nombreRetencion = nombreRetencion;
                        objRetencion[cantidadElementos].esRetManual = esRetManual;
                    }
                } else {
                    objRetencion[0] = new Object();
                    objRetencion[0].codigo = codigo_retencion;
                    objRetencion[0].importe_factura_pagar = parseFloat(importe_a_pagar, 10);
                    objRetencion[0].imp_retenido_anterior = 0;
                    objRetencion[0].base_calculo_retencion = 0;
                    objRetencion[0].base_calculo_retencion_impresion = 0;
                    objRetencion[0].importe_retencion = 0;
                    objRetencion[0].esFacturaM = esFacturaM;
                    objRetencion[0].imp_neto_factura = parseFloat(impNetoFactura, 10);
                    objRetencion[0].calcularSobreIVA = calcularSobreIVA;
                    objRetencion[0].nombreRetencion = nombreRetencion;
                    objRetencion[0].esRetManual = esRetManual;
                }
            }
            log.debug("L54 - Calculo Retenciones", "RETURN - objRetencion: " + JSON.stringify(objRetencion));
            log.audit("L54 - Calculo Retenciones", "FIN - agregarCodigoRetencion");
            return objRetencion;
        }

        //ABRITO 09/11/2018: Método que me devuelve el codigo de retencion y alicuota de retencion para un tipo de Padron de IIBB
        function obtenerCodigosRetencionPadronesIIBB(id_proveedor, subsidiaria) {

            log.debug("obtenerCodigosRetencionPadronesIIBB", "INICIO - obtenerCodigosRetencionPadronesIIBB");
            //log.debug("L54 - Calculo Retenciones", "Parámetros - idTipoPadron: " + idTipoPadron + " - id_proveedor: " + id_proveedor + " - jurisdiccion: " + jurisdiccion);
            log.debug("obtenerCodigosRetencionPadronesIIBB", "Parámetros - id_proveedor: " + id_proveedor + " - subsidiaria: " + subsidiaria);

            var codigoRetencionIIBB = new Object();
            codigoRetencionIIBB.codigo = "";
            codigoRetencionIIBB.alicuota = "";
            var arregloCodigosRetencionPadronIIBB = [];

            //SAVE SEARCH A EJECUTAR
            var searchEntJurisdicc = search.load({
                id: "customsearch_l54_iibb_entidad_jurisdicc"
            });

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "custrecord_l54_pv_jc_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchEntJurisdicc.filters.push(filtroSubsidiaria);
            }

            //FILTRO ID PROVEEDOR
            if (!isEmpty(id_proveedor)) {
                var filtroProveedor = search.createFilter({
                    name: "custrecord_l54_pv_jc_proveedor",
                    operator: search.Operator.IS,
                    values: id_proveedor
                });
                searchEntJurisdicc.filters.push(filtroProveedor);
            }

            var resultSearch = searchEntJurisdicc.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);


            if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                for (var i = 0; i < completeResultSet.length; i++) {

                    arregloCodigosRetencionPadronIIBB[i] = {};

                    arregloCodigosRetencionPadronIIBB[i].idProveedor = id_proveedor;

                    var codigoRetencionPadron = completeResultSet[i].getValue({
                        name: resultSearch.columns[1]
                    });//CODIGO RETENCION PADRON

                    var alicuotaRetencionPadron = completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    });//ALICUOTA RETENCION PADRON

                    var tipoPadron = completeResultSet[i].getValue({
                        name: resultSearch.columns[3]
                    });//TIPO PADRON

                    var jurisdiccion = completeResultSet[i].getValue({
                        name: resultSearch.columns[5]
                    });//JURISDICCIÓN PADRON

                    var estadoInscripcionPadron = completeResultSet[i].getValue({
                        name: resultSearch.columns[6]
                    });//ESTADO INSCRIPCIÓN PADRON

                    var excluyente = completeResultSet[i].getValue({
                        name: resultSearch.columns[7]
                    });//EXCLUYENTE

                    var coeficienteRetencion = completeResultSet[i].getValue({
                        name: resultSearch.columns[8]
                    });//COEFICIENTE RETENCION

                    var alicuotaRetencionEspecial = completeResultSet[i].getValue({
                        name: resultSearch.columns[9]
                    });//ALICUOTA RETENCION ESPECIAL

                    var periodo = completeResultSet[i].getValue({
                        name: resultSearch.columns[10]
                    });//ALICUOTA RETENCION ESPECIAL 
                    //* JHB: Agregar columna al saved search

                    if (!isEmpty(codigoRetencionPadron))
                        arregloCodigosRetencionPadronIIBB[i].codigo = codigoRetencionPadron;

                    if (!isEmpty(alicuotaRetencionPadron))
                        arregloCodigosRetencionPadronIIBB[i].alicuota = alicuotaRetencionPadron;

                    if (!isEmpty(tipoPadron))
                        arregloCodigosRetencionPadronIIBB[i].tipoPadron = tipoPadron;

                    if (!isEmpty(jurisdiccion))
                        arregloCodigosRetencionPadronIIBB[i].jurisdiccion = jurisdiccion;

                    if (!isEmpty(estadoInscripcionPadron))
                        arregloCodigosRetencionPadronIIBB[i].estadoInscripcionPadron = estadoInscripcionPadron;

                    if (!isEmpty(excluyente))
                        arregloCodigosRetencionPadronIIBB[i].excluyente = excluyente;
                    else
                        arregloCodigosRetencionPadronIIBB[i].excluyente = "F";

                    if (!isEmpty(coeficienteRetencion))
                        arregloCodigosRetencionPadronIIBB[i].coeficienteRetencion = coeficienteRetencion;

                    if (!isEmpty(alicuotaRetencionEspecial))
                        arregloCodigosRetencionPadronIIBB[i].alicuotaRetencionEspecial = alicuotaRetencionEspecial;

                    if (!isEmpty(periodo))
                        arregloCodigosRetencionPadronIIBB[i].periodo = periodo;

                }
            }
            else {
                log.debug("obtenerCodigosRetencionPadronesIIBB", "obtenerCodigosRetencionPadronesIIBB - No se encuentro informacion para el tipo de padron y proveedor recibido por parametro");
            }

            log.debug("obtenerCodigosRetencionPadronesIIBB", "RETURN - obtenerCodigosRetencionPadronesIIBB: " + JSON.stringify(arregloCodigosRetencionPadronIIBB));
            log.audit("obtenerCodigosRetencionPadronesIIBB", "FIN - obtenerCodigosRetencionPadronesIIBB");
            return arregloCodigosRetencionPadronIIBB;
        }

        //ABRITO 09/11/2018: Método que me devuelve por cada Jurisdiccion de IIBB los Codigos de Retencion a utilizar
        function obtenerCodigosRetencionIIBB(id_proveedor, subsidiaria, objEstadosIIBB, idConfGeneral, importeNetoTotalFacturas, resultsNetosJurisdiccion, arrayJurisdiccionesEntregaUnificado, existeFacturaSinJurisdiccionEntrega, tipoContribuyenteIVA, importeBrutoFacturasProveedorNormal, jurisdiccionCordoba, importeBrutoFacturasAliados, importeBrutoTotalFacturas,id_posting_period) {

            var codigosRetencionIIBB = {};
            codigosRetencionIIBB.error = false;
            codigosRetencionIIBB.mensaje = "";
            codigosRetencionIIBB.infoRet = [];
            codigosRetencionIIBB.warning = false;

            var codigosRetencionJurisdiccionEntregaIIBB = {};
            codigosRetencionJurisdiccionEntregaIIBB.error = false;
            codigosRetencionJurisdiccionEntregaIIBB.mensaje = "";
            codigosRetencionJurisdiccionEntregaIIBB.infoRet = [];
            codigosRetencionJurisdiccionEntregaIIBB.warning = false;

            try {
                log.audit("obtenerCodigosRetencionIIBB", "INICIO - obtenerCodigosRetencionIIBB");
                log.debug("obtenerCodigosRetencionIIBB", "Parámetros - id_proveedor: " + id_proveedor + " - subsidiaria: " + subsidiaria + " - objEstadosIIBB: " + JSON.stringify(objEstadosIIBB) + " - idConfGeneral: " + idConfGeneral + " - importeNetoTotalFacturas: " + importeNetoTotalFacturas + " - resultsNetosJurisdiccion: " + JSON.stringify(resultsNetosJurisdiccion) + " - arrayJurisdiccionesEntregaUnificado: " + JSON.stringify(arrayJurisdiccionesEntregaUnificado) + " - existeFacturaSinJurisdiccionEntrega: " + existeFacturaSinJurisdiccionEntrega + "- tipoContribuyenteIVA: " + tipoContribuyenteIVA + " - importeBrutoFacturasProveedorNormal: " + importeBrutoFacturasProveedorNormal + "- importeBrutoFacturasAliados: " + importeBrutoFacturasAliados);
                var importeNetoJurisdiccion = 0;
                var objJurisdiccionCabecera = [];
                var objJurisdiccionesGlobales = {};
                var indiceObjeto = 0;
                var errorObtCodigoRetIIBB = false;
                var jurisdiccionesSinConfiguracion = "";
                var importeJurisdiccionGeneral = 0;
                var arrayConfigDetalle = [];
                var errorParcial = false;
                var errorPadronExcluyenteGeneral = false;
                var jurisdiccionesExcluyentesText = "";
                var jurisdiccionesEntrega = {};
                jurisdiccionesEntrega.mensajeError = "";

                // BUSCO EL DETALLE DE LA CONFIGURACIÓN GENERAL DE IIBB EN BASE A LA SUBSIDIARIA
                if (!isEmpty(objEstadosIIBB) && !isEmpty(objEstadosIIBB.jurisdicciones) && (objEstadosIIBB.jurisdicciones.length > 0) && !isEmpty(idConfGeneral)) {

                    var arrayConfigDetalle = obtenerConfiguracionDetalleIIBB(idConfGeneral);
                    if (isEmpty(arrayConfigDetalle) || arrayConfigDetalle.length == 0) {
                        errorParcial = true;
                        errorObtCodigoRetIIBB = true;
                        for (var i = 0; i < objEstadosIIBB.jurisdicciones.length; i++) {
                            if (isEmpty(jurisdiccionesSinConfiguracion))
                                jurisdiccionesSinConfiguracion = objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto;
                            else
                                jurisdiccionesSinConfiguracion += ", " + objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto;
                        }
                        log.error("obtenerCodigosRetencionIIBB", "obtenerCodigosRetencionIIBB - No se encontró informacion en el RT IIBB configuración detalle para las jurisdicciones del proveedor");
                    }

                    var condicionParcial = "";

                    if (!errorObtCodigoRetIIBB && !errorParcial) {

                        jurisdiccionesEntrega = jurisdiccionesEntregaValidas(arrayJurisdiccionesEntregaUnificado, arrayConfigDetalle, objEstadosIIBB.jurisdicciones);
                        var arregloCodigosRetencionIIBB = obtenerCodigosRetencionPadronesIIBB(id_proveedor, subsidiaria);

                        for (var i = 0; i < objEstadosIIBB.jurisdicciones.length; i++) {
                            var codigoRetIIBB = {};
                            codigoRetIIBB.excluyente = "F";
                            codigoRetIIBB.coeficienteRetencion = 1;
                            codigoRetIIBB.estadoInscripcionPadron = "";
                            codigoRetIIBB.esPadron = false;
                            errorParcial = false;
                            var errorPadronExcluyente = false;

                            var infoConfigDetalle = arrayConfigDetalle.filter(function (obj) {
                                return ((obj.jurisdiccionConfigDetalle == objEstadosIIBB.jurisdicciones[i].jurisdiccion) && (obj.tipoContribuyenteIIBB.split(",").indexOf(objEstadosIIBB.jurisdicciones[i].tipoContribuyente) >= 0) &&
                                    (obj.jurisdiccionSede === objEstadosIIBB.jurisdicciones[i].jurisdiccionSede) && (obj.tipoContribuyenteIVA.split(",").indexOf(tipoContribuyenteIVA) >= 0));
                            });

                            if (!isEmpty(infoConfigDetalle) && infoConfigDetalle.length > 0) {
                                var padronUsar = infoConfigDetalle[0].padronUsar;
                                var codRetGeneral = infoConfigDetalle[0].codRetGeneral;
                                var cuentaRetencion = infoConfigDetalle[0].cuentaRetencion;
                                var alicuotaRetencion = infoConfigDetalle[0].alicuotaRetencion;
                                var jurisdiccionConfigDetalle = infoConfigDetalle[0].jurisdiccionConfigDetalle;
                                var alicuota_especial = infoConfigDetalle[0].alicuota_especial;
                                var porcentaje_alicuota_utilizar = infoConfigDetalle[0].porcentaje_alicuota_utilizar;
                                var idConvenioLocal = infoConfigDetalle[0].idConvenioLocal;
                                var idConvenioMultilateral = infoConfigDetalle[0].idConvenioMultilateral;
                                var idResponsableInscripto = infoConfigDetalle[0].idResponsableInscripto;
                                var idMonotrotributista = infoConfigDetalle[0].idMonotrotributista;
                                var porcentajeEspecialCoeficienteCero = infoConfigDetalle[0].porcentajeEspecialCoeficienteCero;
                                var porcentajeAlicUtilSedeNoTucuman = infoConfigDetalle[0].porcentajeAlicUtilSedeNoTucuman;
                                var porcentajeEspecialUtilizarBI = infoConfigDetalle[0].porcentajeEspecialUtilizarBI;
                                var baseCalcAcumulada = infoConfigDetalle[0].baseCalcAcumulada;
                                var calcularSobreNeto = infoConfigDetalle[0].calcularSobreNeto;
                                var calcularSobreBruto = infoConfigDetalle[0].calcularSobreBruto;
                                var impMinBaseCalculoRet = infoConfigDetalle[0].impMinBaseCalculoRet;
                                var criterioPorcentajeEspecial = infoConfigDetalle[0].criterioPorcentajeEspecial;
                                var jurisdiccionSede = infoConfigDetalle[0].jurisdiccionSede;


                                if (!isEmpty(cuentaRetencion)) {
                                    var alicuotaPadronEncontrada = false;
                                    if ((!isEmpty(padronUsar) && padronUsar > 0) || !isEmpty(jurisdiccionConfigDetalle)) {
                                        //CONSULTO LA ALICUOTA DEL PADRON
                                        codigoRetIIBB = obtenerCodigoRetencionPadronIIBB(arregloCodigosRetencionIIBB, padronUsar, id_proveedor, jurisdiccionConfigDetalle, id_posting_period);
                                        log.debug("obtenerCodigosRetencionIIBB", "codigoRetIIBB: " + JSON.stringify(codigoRetIIBB));
                                        if ((!isEmpty(codigoRetIIBB) && !isEmpty(codigoRetIIBB.codigo) && !isEmpty(codigoRetIIBB.alicuota) && !isNaN(codigoRetIIBB.alicuota) && codigoRetIIBB.codigo > 0)) {
                                            alicuotaPadronEncontrada = true;
                                            codigoRetIIBB.alicuota = codigoRetIIBB.alicuota;
                                            codigoRetIIBB.alicuotaRetencionEspecial = codigoRetIIBB.alicuotaRetencionEspecial;
                                        }
                                    }
                                    if (!alicuotaPadronEncontrada) {
                                        //OBTENGO LA ALICUOTA GENERAL
                                        codigoRetIIBB.excluyente = "F";
                                        codigoRetIIBB.coeficienteRetencion = 1;
                                        codigoRetIIBB.estadoInscripcionPadron = "";
                                        codigoRetIIBB.esPadron = false;
                                        codigoRetIIBB.codigo = codRetGeneral;
                                        codigoRetIIBB.alicuota = alicuotaRetencion;
                                        codigoRetIIBB.alicuotaRetencionEspecial = 0;

                                        if (!isEmpty(codigoRetIIBB) && !isEmpty(codigoRetIIBB.codigo) && !isEmpty(codigoRetIIBB.alicuota) && !isNaN(codigoRetIIBB.alicuota) && codigoRetIIBB.codigo > 0) {
                                            alicuotaPadronEncontrada = true;
                                        } else {
                                            errorObtCodigoRetIIBB = true;
                                            errorParcial = true;
                                        }
                                    } else {
                                        if (alicuotaPadronEncontrada && (codigoRetIIBB.excluyente == "T" || codigoRetIIBB.excluyente == true)) {
                                            errorPadronExcluyenteGeneral = true;
                                            errorPadronExcluyente = true;
                                        }
                                    }
                                } else {
                                    errorObtCodigoRetIIBB = true;
                                    errorParcial = true;
                                }

                                if (errorParcial || errorPadronExcluyente) {
                                    if (errorParcial) {
                                        if (isEmpty(jurisdiccionesSinConfiguracion))
                                            jurisdiccionesSinConfiguracion = objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto;
                                        else
                                            jurisdiccionesSinConfiguracion += ", " + objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto;
                                    }

                                    if (errorPadronExcluyente) {
                                        if (isEmpty(jurisdiccionesExcluyentesText))
                                            jurisdiccionesExcluyentesText = objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto;
                                        else
                                            jurisdiccionesExcluyentesText += ", " + objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto;
                                    }
                                } else {
                                    // Genero el Objeto de Respuesta
                                    //log.debug("L54 - Calculo Retenciones", "i: " + i + ", objEstadosIIBB: " + JSON.stringify(objEstadosIIBB));
                                    infoRet = new Object();
                                    infoRet.codigo = codigoRetIIBB.codigo;
                                    infoRet.cuenta = cuentaRetencion;
                                    var existeDobleRetencion = false;
                                    infoRet.codigoJurisdiccionDireccionEntrega = "";
                                    infoRet.idJurisdiccionDireccionEntrega = "";
                                    infoRet.importe_total_factura_aliados = 0.0;
                                    objJurisdiccionCabecera = [];
                                    importeNetoJurisdiccion = 0;
                                    objJurisdiccionesGlobales = [];
                                    importeJurisdiccionGeneral = 0;
                                    var existeDobleRetencionCordoba = false;

                                    /* Verificación de jurisdicción que se va iterando para saber si pertenece sólo a la Configuración General IIBB 
                                    Funcionalidad para sumar el importe de una jurisdicción que está configurada sólo en la Configuración General IIBB */
                                    if (!isEmpty(objEstadosIIBB.jurisdicciones[i].esJurisdiccionGeneral) && (objEstadosIIBB.jurisdicciones[i].esJurisdiccionGeneral)) {
                                        for (var j = 0; j < resultsNetosJurisdiccion.length; j++) {
                                            if (resultsNetosJurisdiccion[j].jurisdiccion == objEstadosIIBB.jurisdicciones[i].jurisdiccion) {
                                                importeJurisdiccionGeneral = parseFloat(resultsNetosJurisdiccion[j].importe, 10);
                                                break;
                                            }
                                        }

                                        infoRet.importe_factura_pagar = parseFloat(importeJurisdiccionGeneral, 10);

                                    } else {

                                        // Se verifica si la jurisdicción es de Córdoba
                                        if (!isEmpty(jurisdiccionCordoba) && !isEmpty(objEstadosIIBB.jurisdicciones[i].jurisdiccion) && objEstadosIIBB.jurisdicciones[i].jurisdiccion == jurisdiccionCordoba) {

                                            // Se verifica si existe importes para facturas de aliados
                                            if (!isNaN(importeBrutoFacturasAliados) && parseFloat(importeBrutoFacturasAliados, 10) > 0) {
                                                infoRet.importe_total_factura_aliados = parseFloat(importeBrutoFacturasAliados, 10);
                                            } else {
                                                infoRet.importe_total_factura_aliados = 0.0;
                                            }

                                            // Se verifica si existe importes para facturas de proveedores normales
                                            if (!isNaN(importeBrutoFacturasProveedorNormal) && parseFloat(importeBrutoFacturasProveedorNormal, 10) > 0) {
                                                infoRet.importe_factura_pagar = parseFloat(importeBrutoFacturasProveedorNormal, 10);
                                            } else {
                                                infoRet.importe_factura_pagar = 0.0;
                                            }

                                            // Se verifica si existe el padrón, para crear dos registros de retenciones para Córdoba
                                            if (!isNaN(importeBrutoFacturasAliados) && parseFloat(importeBrutoFacturasAliados, 10) >= 0 && !isNaN(importeBrutoFacturasProveedorNormal) && parseFloat(importeBrutoFacturasProveedorNormal, 10) >= 0 && codigoRetIIBB.esPadron) {

                                                existeDobleRetencionCordoba = true;

                                            } else {

                                                // Se verifica si existe alicuota general para unificar todos los importes.
                                                if (!isNaN(importeBrutoFacturasAliados) && !isNaN(importeBrutoFacturasProveedorNormal)) {
                                                    infoRet.importe_factura_pagar = parseFloat(importeBrutoFacturasAliados, 10) + parseFloat(importeBrutoFacturasProveedorNormal, 10);
                                                } else {
                                                    infoRet.importe_factura_pagar += !isNaN(importeBrutoFacturasAliados) ? parseFloat(importeBrutoFacturasAliados, 10) : 0;
                                                    infoRet.importe_factura_pagar += !isNaN(importeBrutoFacturasProveedorNormal) ? parseFloat(importeBrutoFacturasProveedorNormal, 10) : 0;
                                                }

                                                if (!isNaN(importeBrutoFacturasAliados) && parseFloat(importeBrutoFacturasAliados, 10) > 0 && !isNaN(importeBrutoFacturasProveedorNormal) && parseFloat(importeBrutoFacturasProveedorNormal, 10) > 0 && !codigoRetIIBB.esPadron && codigoRetIIBB.alicuotaRetencionEspecial == 0) {
                                                    existeDobleRetencionCordoba = false;
                                                    infoRet.importe_total_factura_aliados = 0.0;
                                                }
                                            }

                                        } else { // Jurisdicciones restantes

                                            if (!isEmpty(calcularSobreBruto) && calcularSobreBruto) {
                                                infoRet.importe_factura_pagar = parseFloat(importeBrutoTotalFacturas, 10);
                                            } else {
                                                infoRet.importe_factura_pagar = parseFloat(importeNetoTotalFacturas, 10);
                                            }

                                            log.audit("obtenerCodigosRetencionIIBB", "LINE 6313 / infoRet.importe_factura_pagar: " + infoRet.importe_factura_pagar + " / i: " + i + ", objEstadosIIBB: " + JSON.stringify(objEstadosIIBB.jurisdicciones[i]));

                                            if (!isEmpty(resultsNetosJurisdiccion) && resultsNetosJurisdiccion.length > 0) {
                                                objJurisdiccionCabecera = resultsNetosJurisdiccion.filter(function (obj) {
                                                    return (obj.jurisdiccion == objEstadosIIBB.jurisdicciones[i].jurisdiccion);
                                                });
                                            }

                                            log.audit("obtenerCodigosRetencionIIBB", "objJurisdiccionCabecera: " + JSON.stringify(objJurisdiccionCabecera));

                                            if (!isEmpty(objJurisdiccionCabecera) && objJurisdiccionCabecera.length > 0) {
                                                importeNetoJurisdiccion = objJurisdiccionCabecera[0].importe;
                                            }

                                            // se le suma el neto de las facturas con jurisdiccion definida en cabeceras (jurisdiccion unica)
                                            infoRet.importe_factura_pagar += importeNetoJurisdiccion;
                                            log.audit("obtenerCodigosRetencionIIBB", "line 2977 - importe_factura_pagar: " + infoRet.importe_factura_pagar);
                                        }
                                    }

                                    if (parseFloat(countDecimales(parseFloat(infoRet.importe_factura_pagar, 10)), 10) > 13)
                                        infoRet.importe_factura_pagar = parseFloat(infoRet.importe_factura_pagar, 10).toFixedOK(2);

                                    var dataJurisdiccionEntrega = [];
                                    if (!isEmpty(jurisdiccionesEntrega) && !isEmpty(jurisdiccionesEntrega.infoJurisdicciones) && jurisdiccionesEntrega.infoJurisdicciones.length > 0) {
                                        dataJurisdiccionEntrega = jurisdiccionesEntrega.infoJurisdicciones.filter(function (obj) {
                                            return (obj.jurisdiccionEntregaID == objEstadosIIBB.jurisdicciones[i].jurisdiccion);
                                        });
                                    }

                                    log.debug("obtenerCodigosRetencionIIBB", "LINE 5379 - dataJurisdiccionEntrega: " + JSON.stringify(dataJurisdiccionEntrega));

                                    // Se verifica si hay alguna jurisdicción de entrega asociada a la jurisdicción de TUCUMÁN
                                    if (!isEmpty(dataJurisdiccionEntrega) && dataJurisdiccionEntrega.length > 0) {
                                        var diferenciaImportesJurisdiccion = parseFloat(parseFloat(infoRet.importe_factura_pagar, 10) - parseFloat(dataJurisdiccionEntrega[0].impNetoFactJurisdiccionEntrega, 10), 10);
                                        infoRet.codigoJurisdiccionDireccionEntrega = dataJurisdiccionEntrega[0].jurisdiccionEntregaCodigo;
                                        infoRet.idJurisdiccionDireccionEntrega = dataJurisdiccionEntrega[0].jurisdiccionEntregaID;

                                        if ((diferenciaImportesJurisdiccion > parseFloat(0.07, 10) || existeFacturaSinJurisdiccionEntrega) && (dataJurisdiccionEntrega[0].jurisdiccionEntregaCodigo == 924 || dataJurisdiccionEntrega[0].jurisdiccionEntregaID == 24) && (isEmpty(objEstadosIIBB.jurisdicciones[i].esJurisdiccionGeneral) || (!objEstadosIIBB.jurisdicciones[i].esJurisdiccionGeneral))) {
                                            // infoRet.importe_factura_pagar = parseFloat(infoRet.importe_factura_pagar, 10) - parseFloat(dataJurisdiccionEntrega[0].impNetoFactJurisdiccionEntrega, 10);
                                            infoRet.importe_factura_pagar = diferenciaImportesJurisdiccion;
                                            infoRet.codigoJurisdiccionDireccionEntrega = "";
                                            infoRet.idJurisdiccionDireccionEntrega = "";
                                            existeDobleRetencion = true;
                                        }
                                    }

                                    log.audit("obtenerCodigosRetencionIIBB", "LINE 5396 - infoRet.importe_factura_pagar: " + infoRet.importe_factura_pagar);

                                    if (parseFloat(countDecimales(parseFloat(infoRet.importe_factura_pagar, 10)), 10) > 13)
                                        infoRet.importe_factura_pagar = parseFloat(parseFloat(infoRet.importe_factura_pagar, 10).toFixedOK(2), 10);

                                    if (parseFloat(countDecimales(parseFloat(infoRet.importe_total_factura_aliados, 10)), 10) > 13)
                                        infoRet.importe_total_factura_aliados = parseFloat(parseFloat(infoRet.importe_total_factura_aliados, 10).toFixedOK(2), 10);

                                    log.audit("obtenerCodigosRetencionIIBB", "LINE 5401 - infoRet.importe_factura_pagar: " + infoRet.importe_factura_pagar + " - infoRet.importe_total_factura_aliados: " + infoRet.importe_total_factura_aliados);

                                    infoRet.condicion = objEstadosIIBB.jurisdicciones[i].tipoContribuyenteTexto;
                                    //Nuevo - ID Tipo Contribuyente IIBB
                                    infoRet.condicionID = objEstadosIIBB.jurisdicciones[i].tipoContribuyente;
                                    infoRet.jurisdiccion = objEstadosIIBB.jurisdicciones[i].jurisdiccion;
                                    // Nuevo - Considerar Procentaje de Retenciones
                                    // infoRet.porcentajeRetencion = parseFloat((parseFloat(codigoRetIIBB.alicuota, 10) / 100), 10).toString();
                                    infoRet.porcentajeRetencion = parseFloat(parseFloat(convertToInteger(codigoRetIIBB.alicuota), 10) / (100 * Math.pow(10, countDecimales(codigoRetIIBB.alicuota))), 10).toString();
                                    // Nuevo - Almacenar Fecha Exencion,Tipo Exencion y Certificado Exencion
                                    infoRet.certExencion = objEstadosIIBB.jurisdicciones[i].certExencion;
                                    infoRet.tipoExencion = objEstadosIIBB.jurisdicciones[i].tipoExencion;
                                    infoRet.fcaducidadExencion = objEstadosIIBB.jurisdicciones[i].fcaducidadExencion;
                                    // Nuevo - Almacenar Código de Jurisdicción
                                    infoRet.jurisdiccionCodigo = objEstadosIIBB.jurisdicciones[i].jurisdiccionCodigo;
                                    infoRet.estadoInscripcionPadron = codigoRetIIBB.estadoInscripcionPadron;
                                    infoRet.coeficienteRetencion = jurisdiccionSede ? 1 : codigoRetIIBB.coeficienteRetencion;
                                    infoRet.esPadron = codigoRetIIBB.esPadron;
                                    infoRet.porcentaje_alicuota_utilizar = porcentaje_alicuota_utilizar;
                                    infoRet.alicuota_especial = alicuota_especial;
                                    infoRet.idConvenioLocal = idConvenioLocal;
                                    infoRet.idConvenioMultilateral = idConvenioMultilateral;
                                    infoRet.idResponsableInscripto = idResponsableInscripto;
                                    infoRet.idMonotrotributista = idMonotrotributista;
                                    infoRet.porcentajeEspecialCoeficienteCero = porcentajeEspecialCoeficienteCero;
                                    infoRet.porcentajeAlicUtilSedeNoTucuman = porcentajeAlicUtilSedeNoTucuman;
                                    infoRet.jurisdiccionTexto = objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto;
                                    infoRet.porcentajeEspecialUtilizarBI = porcentajeEspecialUtilizarBI;
                                    infoRet.alicuotaRetencionEspecial = codigoRetIIBB.alicuotaRetencionEspecial;
                                    infoRet.esRetencionAliados = false;
                                    infoRet.baseCalcAcumulada = baseCalcAcumulada;
                                    infoRet.calcularSobreBruto = calcularSobreBruto;
                                    infoRet.impMinBaseCalculoRet = impMinBaseCalculoRet;
                                    infoRet.criterioPorcentajeEspecial = criterioPorcentajeEspecial;

                                    codigosRetencionIIBB.infoRet.push(infoRet);

                                    log.debug("obtenerCodigosRetencionIIBB", "LINE 5432 - infoRet: " + JSON.stringify(infoRet));
                                    log.debug("obtenerCodigosRetencionIIBB", "LINE 5441 - infoRet.importe_factura_pagar: " + parseFloat(infoRet.importe_factura_pagar, 10));
                                    log.debug("obtenerCodigosRetencionIIBB", "LINE 5433 - codigosRetencionIIBB.infoRet: " + JSON.stringify(codigosRetencionIIBB.infoRet));

                                    // if ((codigoRetIIBB.esPadron && !isEmpty(codigoRetIIBB.estadoInscripcionPadron) && existeDobleRetencion && !isEmpty(idConvenioMultilateral) && codigoRetIIBB.estadoInscripcionPadron == idConvenioMultilateral) || (!codigoRetIIBB.esPadron && existeDobleRetencion && (tipoContribuyenteIVA == idResponsableInscripto || tipoContribuyenteIVA == idMonotrotributista))) {
                                    // Aplica solo a la jurisdicción de TUCUMÁN
                                    if (existeDobleRetencion) {
                                        // var indiceObjetoAux = parseInt(indiceObjeto, 10) + parseInt(1, 10);
                                        var objCodigoRetencionJurisdiccionEntrega = obtenerDatosJurisdiccionEntrega(infoRet, dataJurisdiccionEntrega[0]);
                                        if (!isEmpty(objCodigoRetencionJurisdiccionEntrega) && !objCodigoRetencionJurisdiccionEntrega.error) {
                                            log.debug("obtenerCodigosRetencionIIBB", "LINE 5435 - existeDobleRetencion=" + JSON.stringify(objCodigoRetencionJurisdiccionEntrega));
                                            codigosRetencionIIBB.infoRet.push(objCodigoRetencionJurisdiccionEntrega);
                                        }
                                    }

                                    if (existeDobleRetencionCordoba) {
                                        var datosCordobaDuplicado = obtenerDatosJurisdiccionCordoba(infoRet, true);
                                        if (!isEmpty(datosCordobaDuplicado) && !datosCordobaDuplicado.error) {
                                            codigosRetencionIIBB.infoRet.push(datosCordobaDuplicado);
                                        }
                                    }

                                    log.debug("obtenerCodigosRetencionIIBB", "LINE 5466 - codigosRetencionIIBB.infoRet: " + JSON.stringify(codigosRetencionIIBB.infoRet));
                                }
                            } else {
                                errorObtCodigoRetIIBB = true;

                                if (isEmpty(jurisdiccionesSinConfiguracion))
                                    jurisdiccionesSinConfiguracion = objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto;
                                else
                                    jurisdiccionesSinConfiguracion += ", " + objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto;
                            }
                        }
                    }
                }

                /* for (var i = 0; i < codigosRetencionJurisdiccionEntregaIIBB.infoRet.length; i++) {
                    codigosRetencionJurisdiccionEntregaIIBB
                } */

                log.debug("obtenerCodigosRetencionIIBB", "errorObtCodigoRetIIBB: " + errorObtCodigoRetIIBB + " - errorPadronExcluyenteGeneral: " + errorPadronExcluyenteGeneral + " - jurisdiccionesEntrega.mensajeError: " + jurisdiccionesEntrega.mensajeError);
                if (errorObtCodigoRetIIBB || errorPadronExcluyenteGeneral || !isEmpty(jurisdiccionesEntrega.mensajeError)) {
                    // codigosRetencionIIBB.error = true;
                    codigosRetencionIIBB.warning = true;

                    if (errorObtCodigoRetIIBB)
                        codigosRetencionIIBB.mensaje = "No se encuentra correctamente parametrizada la Configuración Detalle IIBB para las Jurisdicciones : " + jurisdiccionesSinConfiguracion + ". Pertenecientes a la Conf General con ID Interno : " + idConfGeneral + ".\n";

                    if (errorPadronExcluyenteGeneral)
                        codigosRetencionIIBB.mensaje = "El proveedor está excluido por la Configuración de Padrón en las Jurisdicciones : " + jurisdiccionesExcluyentesText + ", por lo tanto no se le calculará retenciones en las mismas.\n";

                    if (!isEmpty(jurisdiccionesEntrega.mensajeError))
                        codigosRetencionIIBB.mensaje = jurisdiccionesEntrega.mensajeError + ".\n";
                }
            } catch (e) {
                log.error("obtenerCodigosRetencionIIBB", "Excepción error proceso de Netsuite - Detalle Error: " + e.message);
                codigosRetencionIIBB.error = true;
                codigosRetencionIIBB.mensaje = "Error en proceso de obtención de códigos de retención IIBB, error excepción: " + e.message;
            }

            log.debug("obtenerCodigosRetencionIIBB", "RETURN - codigosRetencionIIBB: " + JSON.stringify(codigosRetencionIIBB));
            log.audit("obtenerCodigosRetencionIIBB", "FIN - obtenerCodigosRetencionIIBB");
            return codigosRetencionIIBB;
        }

        //ABRITO 12/11/2018: Funcion que devuelve la descripcion del tipo de contribuyente (SUSS, IVA, GANANCIAS) del proveedor indicado por parametro.
        function getCondicion(id_proveedor) {

            log.audit("L54 - Calculo Retenciones", "INICIO - getCondicion");
            log.debug("L54 - Calculo Retenciones", "Parámetros - id_proveedor: " + id_proveedor);

            var codRetProveedor = new Object();

            //SAVE SEARCH A EJECUTAR
            var searchProveedor = search.load({
                id: "customsearch_l54_proveedor_cal_ret"
            });

            //FILTRO PROVEEDOR
            if (!isEmpty(id_proveedor)) {
                var filtroProveedor = search.createFilter({
                    name: "internalid",
                    operator: search.Operator.IS,
                    values: id_proveedor
                });
                searchProveedor.filters.push(filtroProveedor);
            }

            var resultSearch = searchProveedor.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);


            if (!isEmpty(completeResultSet)) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    codRetProveedor.codRetIVA = completeResultSet[i].getText({
                        name: resultSearch.columns[2]
                    });//CODIGO RETENCION IVA (DESCRIPCION)

                    codRetProveedor.codRetSUSS = completeResultSet[i].getText({
                        name: resultSearch.columns[3]
                    });//CODIGO RETENCION SUSS (DESCRIPCION)

                    codRetProveedor.codRetGAN = completeResultSet[i].getText({
                        name: resultSearch.columns[4]
                    });//CODIGO RETENCION GANANCIAS (DESCRIPCION)
                }
            }
            else {
                log.error("L54 - Calculo Retenciones", "getCondicion - No se encuentro informacion para el proveedor recibido por parametro");
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - codRetProveedor: " + JSON.stringify(codRetProveedor));
            log.audit("L54 - Calculo Retenciones", "FIN - getCondicion");
            return codRetProveedor;
        }

        //ABRITO 13/11/2018: Funcion que devuelve el importe de retencion correspondiente a un tipo de retención, código de retención e importe recibido por parametro
        function getRetencion(id_proveedor, id_tipo_ret, codigo_retencion, base_calculo, id_posting_period, importe_retenido_ant, tasa_cambio, porcentajeRetIIBB, consImpRetAnt, nombreRetencionCalculada, baseCalculoRetencionesAcumuladas) {

            log.audit("L54 - Calculo Retenciones", "INICIO - getRetencion");
            log.debug("L54 - Calculo Retenciones", "Parámetros - id_proveedor: " + id_proveedor + " - id_tipo_ret: " + id_tipo_ret + " - codigo_retencion: " + codigo_retencion + " - base_calculo: " + base_calculo + " - id_posting_period: " + id_posting_period + " - importe_retenido_ant: " + importe_retenido_ant + " - tasa_cambio: " + tasa_cambio + " - porcentajeRetIIBB: " + porcentajeRetIIBB + " - consImpRetAnt: " + consImpRetAnt + " - nombreRetencionCalculada: " + nombreRetencionCalculada + " - baseCalculoRetencionesAcumuladas: " + parseFloat(baseCalculoRetencionesAcumuladas, 10));

            var objRetencion = new Object();
            objRetencion.importeRetencion = 0;
            objRetencion.alicuotaRetencion = 0;
            objRetencion.warning = false;
            objRetencion.mensaje = "";
            var nombreRetencion = null;
            var valores = new Array();

            if (parseFloat(base_calculo, 10) <= 0) {
                objRetencion.importeRetencion = 0;
                objRetencion.alicuotaRetencion = 0;
                return objRetencion;
            }

            // Se extraen los los detalles de la parametrización de retenciones asociadas
            // var base_calculo_aux = parseFloat(parseFloat(base_calculo, 10) - parseFloat(baseCalculoRetencionesAcumuladas, 10), 10).toFixedOK(2);
            if (id_tipo_ret == "iibb") {
                // valores = getParametrosMatriz(codigo_retencion, base_calculo_aux, true);
                valores = getParametrosMatriz(codigo_retencion, base_calculo, true);
            } else {
                // valores = getParametrosMatriz(codigo_retencion, base_calculo_aux, false);
                valores = getParametrosMatriz(codigo_retencion, base_calculo, false);
            }

            //NUEVO - SI ES RETENCION DE IIBB, EL PROCENTAJE A RETENER NO VIENE DEL CODIGO DE RETENCION, SI NO ES UN PARAMETRO DE CODIGO_RETENCION.PORCENTAJERETENCION
            var errorAlicuotaRetencion = false;
            var errorDetalle = false;

            if (valores["detalle_encontrado"] && valores["detalle_encontrado_importes"]) {
                var porcentajeRetencion = valores["porcentaje"];
                nombreRetencion = valores["nombre_ret"];

                if (id_tipo_ret == "iibb") {
                    log.debug("L54 - Calculo Retenciones", "Retencion IIBB - Porcentaje : " + porcentajeRetIIBB);
                    if (isEmpty(porcentajeRetIIBB) || isNaN(porcentajeRetIIBB)) {
                        log.debug("L54 - Calculo Retenciones", "Retencion IIBB - Porcentaje No Valido");
                        errorAlicuotaRetencion = true;
                    }
                    else {
                        //porcentajeRetencion = parseFloat((parseFloat(porcentajeRetIIBB, 10) * 100), 10);
                        porcentajeRetencion = parseFloat(parseFloat(porcentajeRetIIBB, 10), 10);
                        log.debug("L54 - Calculo Retenciones", "Retencion IIBB - Porcentaje Final : " + porcentajeRetencion);
                    }
                }
            }
            else {
                errorDetalle = true;
            }

            if (isEmpty(nombreRetencion))
                nombreRetencion = nombreRetencionCalculada;

            var textoRetencion = "";
            if (id_tipo_ret == "gan") {
                textoRetencion = "GANANCIAS";
            }
            else {
                if (id_tipo_ret == "suss") {
                    textoRetencion = "SUSS";
                }
                else {
                    if (id_tipo_ret == "iva") {
                        textoRetencion = "IVA";
                    }
                    else {
                        textoRetencion = "IIBB";
                    }
                }
            }

            if (errorDetalle == false && errorAlicuotaRetencion == false && !isEmpty(porcentajeRetencion) && !isNaN(porcentajeRetencion)) {
                log.audit("getRetencion", "base_calculo: " + base_calculo + ", valores[excedente]: " + valores["excedente"] + ", porcentajeRetencion: " + porcentajeRetencion);

                var retencion = base_calculo - parseFloat(valores["excedente"], 10); // verificar esto, si se debe mostrar esta resta en la base de cálculo de impresión o la base de cálculo a mostrar o no.

                var cantDecRetencion = countDecimales(retencion);
                var cantDecPorcentaje = countDecimales(porcentajeRetencion);
                var cantDecTotal = cantDecRetencion + cantDecPorcentaje + 2; // sumo +2 porque se debe incluir los dos 0 del 100 que divide a la ret * porcentaje
                retencion = parseFloat(parseFloat(parseFloat(convertToInteger(retencion), 10) * parseFloat(convertToInteger(porcentajeRetencion), 10), 10) / parseFloat(Math.pow(10, cantDecTotal), 10), 10);
                log.audit("getRetencion", "cantDecTotal: " + cantDecTotal + ", cantDecRetencion: " + cantDecRetencion + ", cantDecPorcentaje: " + cantDecPorcentaje + ", convertToInteger(retencion): " + convertToInteger(retencion) + ", convertToInteger(porcentajeRetencion): " + convertToInteger(porcentajeRetencion) + ", convertToInteger(porcentajeRetencion): " + convertToInteger(porcentajeRetencion) + ", retencion: " + retencion);

                // Acá al monto fijo a retener se le suma a la retención calculada (esto es el importe retenido del Detalle de parametrizacion de Ret.)
                retencion = retencion + parseFloat(valores["monto_fijo_a_retener"], 10);

                //RESTO EL IMPORTE RETENIDO SOLO SI ES GANANCIAS O SUSS
                if (id_tipo_ret == "gan" || id_tipo_ret == "suss" || id_tipo_ret == "iva") {
                    if (!isEmpty(consImpRetAnt) && consImpRetAnt == true)
                        retencion = retencion - importe_retenido_ant;
                }

                if (retencion > parseFloat(valores["minimo_retencion"], 10)) {
                    objRetencion.importeRetencion = parseFloat(retencion, 10);
                    objRetencion.alicuotaRetencion = parseFloat(porcentajeRetencion, 10);
                } else {
                    //return 0;
                    objRetencion.importeRetencion = 0;
                    objRetencion.alicuotaRetencion = 0;
                    objRetencion.warning = true;
                    objRetencion.mensaje = "No se calculará la Retencion " + nombreRetencion + " de " + textoRetencion + " Debido a que no cumple con el monto mínimo de retención.";
                }
            }
            else {

                objRetencion.warning = true;
                if (!valores["detalle_encontrado_importes"] && valores["detalle_encontrado"]) {
                    var mensajeInformar = "los importes del documento no son suficientes para retener (ver detalles de parametrización)";
                } else {
                    var mensajeInformar = "no se encuentra configurado el Detalle de Parametrización de Retencion";
                }

                if (errorDetalle == false) {
                    mensajeInformar = "no se encuentra configurada la Alicuota de Retencion";
                }

                objRetencion.mensaje = "No se calculará la Retencion " + nombreRetencion + " de " + textoRetencion + " Debido a que " + mensajeInformar;
                log.debug("L54 - Calculo Retenciones", "Error Calculando Importe de Retencion - Mensaje : " + objRetencion.mensaje);
                objRetencion.importeRetencion = 0;
                objRetencion.alicuotaRetencion = 0;
            }
            log.debug("L54 - Calculo Retenciones", "RETURN - objRetencion: " + JSON.stringify(objRetencion));
            log.audit("L54 - Calculo Retenciones", "FIN - getRetencion");
            return objRetencion;
        }

        //ABRITO 12/11/2018: Funcion que devuelve la fila correspondiente de la matriz para el tipo retencion, codigo y valor indicado
        function getParametrosMatriz(codigo_retencion, valor, esRetIIBB) {

            log.audit("L54 - Calculo Retenciones", "INICIO - getParametrosMatriz");
            log.debug("L54 - Calculo Retenciones", "Parámetros - codigo_retencion: " + codigo_retencion + " - valor: " + valor + " - esRetIIBB: " + esRetIIBB);

            var minimo_retencion = 0;
            var monto_fijo_a_retener = 0;
            var excedente = 0;
            var porcentaje = 100;
            var nombreRet = "";
            var resultado = new Array();
            resultado["detalle_encontrado"] = false;
            resultado["detalle_encontrado_importes"] = false;

            if (!isEmpty(codigo_retencion)) {
                //SAVE SEARCH A EJECUTAR
                var searchRetDetalle = search.load({
                    id: "customsearch_l54_param_ret_det_cal_ret"
                });

                //FILTRO CODIGO RETENCION PADRE
                if (!isEmpty(codigo_retencion)) {
                    codigo_retencion = parseInt(codigo_retencion);
                    if (esRetIIBB) {
                        var filtroCodRet = search.createFilter({
                            name: "custrecord_l54_param_ret_det_padre",
                            operator: search.Operator.IS,
                            values: codigo_retencion
                        });
                    } else {
                        var filtroCodRet = search.createFilter({
                            name: "internalid",
                            join: "custrecord_l54_param_ret_det_padre",
                            operator: search.Operator.IS,
                            values: codigo_retencion
                        });
                    }
                    searchRetDetalle.filters.push(filtroCodRet);
                }

                /* //FILTRO IMPORTE DESDE Y HASTA
                if (!isEmpty(valor)) {

                    var filtroImpDesde = search.createFilter({
                        name: "custrecord_l54_param_ret_det_imp_desde",
                        operator: search.Operator.LESSTHANOREQUALTO,
                        values: valor
                    });
                    searchRetDetalle.filters.push(filtroImpDesde);

                    var filtroImpHasta = search.createFilter({
                        name: "custrecord_l54_param_ret_det_imp_hasta",
                        operator: search.Operator.GREATERTHAN,
                        values: valor
                    });
                    searchRetDetalle.filters.push(filtroImpHasta);
                } */

                var resultSearch = searchRetDetalle.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!isEmpty(resultado) && resultado.length > 0);

                if ((!isEmpty(completeResultSet)) && (completeResultSet.length > 0)) {
                    for (var i = 0; i < completeResultSet.length; i++) {

                        resultado["detalle_encontrado"] = true;

                        var objInfoDetaParametrizacion = {};

                        objInfoDetaParametrizacion.monto_fijo_a_retener = completeResultSet[i].getValue({
                            name: resultSearch.columns[0]
                        });//IMPORTE RETENIDO

                        objInfoDetaParametrizacion.porcentaje = completeResultSet[i].getValue({
                            name: resultSearch.columns[1]
                        });//PORC. ADICIONAL

                        objInfoDetaParametrizacion.excedente = completeResultSet[i].getValue({
                            name: resultSearch.columns[2]
                        });//EXCEDENTE

                        objInfoDetaParametrizacion.minimo_retencion = completeResultSet[i].getValue({
                            name: resultSearch.columns[5]
                        });//IMPORTE MINIMO RETENCION

                        objInfoDetaParametrizacion.nombreRet = completeResultSet[i].getValue({
                            name: resultSearch.columns[6]
                        });//NOMBRE RETENCION

                        objInfoDetaParametrizacion.importeDesde = completeResultSet[i].getValue({
                            name: resultSearch.columns[7]
                        });//IMPORTE DESDE

                        objInfoDetaParametrizacion.importeHasta = completeResultSet[i].getValue({
                            name: resultSearch.columns[8]
                        });//IMPORTE HASTA

                        log.debug("L54 - Calculo Retenciones", "getParametrosMatriz - objInfoDetaParametrizacion: " + JSON.stringify(objInfoDetaParametrizacion));
                        if (!isEmpty(objInfoDetaParametrizacion.importeDesde) && !isEmpty(objInfoDetaParametrizacion.importeHasta) && !isNaN(objInfoDetaParametrizacion.importeDesde) && !isNaN(objInfoDetaParametrizacion.importeHasta)) {
                            if ((parseFloat(valor, 10) >= parseFloat(objInfoDetaParametrizacion.importeDesde, 10)) && ((parseFloat(valor, 10)) <= parseFloat(objInfoDetaParametrizacion.importeHasta, 10))) {
                                resultado["detalle_encontrado_importes"] = true;
                                break;
                            }
                        }
                    }
                } else {
                    resultado["detalle_encontrado"] = false;
                    log.debug("L54 - Calculo Retenciones", "getParametrosMatriz - No se encontró información de detalle de parametrización para el código de retención");
                }

                if (!resultado["detalle_encontrado_importes"])
                    log.debug("L54 - Calculo Retenciones", "getParametrosMatriz - No se encontró información para el código de retención y valor indicado");

                resultado["minimo_retencion"] = parseFloat(objInfoDetaParametrizacion.minimo_retencion);
                resultado["monto_fijo_a_retener"] = parseFloat(objInfoDetaParametrizacion.monto_fijo_a_retener);
                resultado["excedente"] = parseFloat(objInfoDetaParametrizacion.excedente);
                resultado["nombre_ret"] = objInfoDetaParametrizacion.nombreRet;

                if (!isEmpty(objInfoDetaParametrizacion.porcentaje) && objInfoDetaParametrizacion.porcentaje != 100 && objInfoDetaParametrizacion.porcentaje.substring(objInfoDetaParametrizacion.porcentaje.length - 1) == "%")
                    resultado["porcentaje"] = objInfoDetaParametrizacion.porcentaje.substring(0, objInfoDetaParametrizacion.porcentaje.length - 1);
                else
                    resultado["porcentaje"] = objInfoDetaParametrizacion.porcentaje;
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - resultado: " + JSON.stringify(resultado));
            log.audit("L54 - Calculo Retenciones", "FIN - getParametrosMatriz");
            return resultado;
        }


        //ABRITO 13/11/2018: Funcion que permite obtener el importe retenido para un proveedor en un periodo, tipo de retención y subsidiaria indicada por parametro
        function getImpRetenido(id_proveedor, id_periodo, codigo_retencion, moneda, subsidiaria, esAnualizada, fecha_pago) {

            log.audit("L54 - Calculo Retenciones", "INICIO - getImpRetenido");
            log.debug("L54 - Calculo Retenciones", "Parámetros - id_proveedor: " + id_proveedor + " - id_periodo: " + id_periodo + " - codigo_retencion: " + codigo_retencion + " - moneda: " + moneda + " - subsidiaria: " + subsidiaria + " - esAnualizada: " + esAnualizada + " - fecha_pago: " + fecha_pago);

            //var imp_retenido = 0;
            var informacionImpRetenidoCodRet = [];

            if (!isEmpty(codigo_retencion) && codigo_retencion.length > 0) {

                //SAVE SEARCH A EJECUTAR
                var searchImpRetenido = search.load({
                    id: "customsearch_l54_vendorpayment_imp_ret"
                });

                //FILTRO PROVEEDOR
                if (!isEmpty(id_proveedor)) {
                    var filtroProveedor = search.createFilter({
                        name: "custrecord_l54_ret_ref_proveedor",
                        operator: search.Operator.IS,
                        values: id_proveedor
                    });
                    searchImpRetenido.filters.push(filtroProveedor);
                }

                //FILTRO PERIODO O PERIODO DE ACUERDO A SI ES ANUALIZADA
                if (esAnualizada) {
                    /* var trandateDate = format.parse({
                        value: fecha_pago,
                        type: format.Type.DATE,
                        timezone: format.Timezone.AMERICA_BUENOS_AIRES // Montevideo - Uruguay
                    }); */

                    var trandateDate = fecha_pago;

                    var dia = trandateDate.getDate();
                    var mes = trandateDate.getMonth();
                    var anio = trandateDate.getFullYear();
                    var trandateDate = new Date(anio, mes, dia);

                    // Busco los Pagos Anteriores de Monotributo de la Misma Moneda
                    var fechaInicial = new Date(anio, mes, dia); // ver de poner la fecha actual o la fecha de la transacción
                    fechaInicial.setDate(1);
                    //fechaInicial.setMonth(fechaInicial.getMonth() - 11);
                    fechaInicial.setMonth(0);

                    var fechaFinal = new Date(anio, mes, dia);

                    var fechaInicialAUX = format.format({
                        value: fechaInicial,
                        type: format.Type.DATE,
                        timezone: format.Timezone.AMERICA_BUENOS_AIRES
                    });

                    var fechaFinalAUX = format.format({
                        value: fechaFinal,
                        type: format.Type.DATE,
                        timezone: format.Timezone.AMERICA_BUENOS_AIRES
                    });

                    //FILTRO FECHA DESDE
                    if (!isEmpty(fechaInicialAUX)) {

                        var filtroFechaDesde = search.createFilter({
                            name: "custrecord_l54_ret_fecha",
                            operator: search.Operator.ONORAFTER,
                            values: fechaInicialAUX
                        });
                        searchImpRetenido.filters.push(filtroFechaDesde);
                    }

                    //FILTRO FECHA HASTA
                    if (!isEmpty(fechaFinalAUX)) {

                        var filtroFechaHasta = search.createFilter({
                            name: "custrecord_l54_ret_fecha",
                            operator: search.Operator.ONORBEFORE,
                            values: fechaFinalAUX
                        });
                        searchImpRetenido.filters.push(filtroFechaHasta);
                    }
                } else {
                    if (!isEmpty(id_periodo)) {
                        var filtroPeriodo = search.createFilter({
                            name: "custrecord_l54_ret_periodo",
                            operator: search.Operator.IS,
                            values: id_periodo
                        });
                        searchImpRetenido.filters.push(filtroPeriodo);
                    }
                }

                //FILTRO CODIGO RETENCION
                if (!isEmpty(codigo_retencion)) {
                    var filtroCodRet = search.createFilter({
                        name: "custrecord_l54_ret_cod_retencion",
                        operator: search.Operator.ANYOF,
                        values: codigo_retencion
                    });
                    searchImpRetenido.filters.push(filtroCodRet);
                }

                //FILTRO SUBSIDIARIA
                if (!isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "custrecord_l54_ret_subsidiaria",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    searchImpRetenido.filters.push(filtroSubsidiaria);
                }

                var resultSearch = searchImpRetenido.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!isEmpty(resultado) && resultado.length > 0);

                if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                    for (var i = 0; i < completeResultSet.length; i++) {

                        informacionImpRetenidoCodRet[i] = {};

                        informacionImpRetenidoCodRet[i].codigoRetencion = parseFloat(completeResultSet[i].getValue({
                            name: resultSearch.columns[4]
                        }), 10);//COD RETENCION

                        informacionImpRetenidoCodRet[i].imp_retenido = parseFloat(completeResultSet[i].getValue({
                            name: resultSearch.columns[7]
                        }), 10);//IMPORTE RETENIDO
                    }
                } else {
                    log.debug("L54 - Calcular Retenciones (SS)", "getImpRetenido - No se encuentro informacion de importe retenido para los parametros indicados");
                }
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - informacionImpRetenidoCodRet: " + JSON.stringify(informacionImpRetenidoCodRet));
            log.audit("L54 - Calculo Retenciones", "FIN - getImpRetenido");
            return JSON.stringify(informacionImpRetenidoCodRet);
        }

        //ABRITO 12/11/2018: Funcion devuelve la sumatoria de todos los pagos pasados para un proveedor, periodo, tipo ret. y cod. de ret.
        function getImpPagosPasadosGanMonotributo(id_proveedor, id_periodo, codigo_retencion, fecha_pago, moneda, billsPagar, subsidiaria, tipoRetencion) {

            log.audit("L54 - Calculo Retenciones", "INICIO - getImpPagosPasadosGanMonotributo");
            log.debug("L54 - Calculo Retenciones", "Parámetros - id_proveedor: " + id_proveedor + " - codigo_retencion: " + codigo_retencion + " - fecha_pago: " + fecha_pago + " - subsidiaria: " + subsidiaria + " - tipoRetencion: " + tipoRetencion);

            //var trandateDate = nlapiStringToDate(fecha_pago, "datetimetz");
            /* var trandateDate = format.parse({
                value: fecha_pago,
                type: format.Type.DATE,
                timezone: format.Timezone.AMERICA_BUENOS_AIRES // Montevideo - Uruguay
            }); */

            var trandateDate = fecha_pago;

            var dia = trandateDate.getDate();
            var mes = trandateDate.getMonth();
            var anio = trandateDate.getFullYear();
            var trandateDate = new Date(anio, mes, dia);

            // Busco los Pagos Anteriores de Monotributo de la Misma Moneda
            var fechaInicial = new Date(anio, mes, dia); // ver de poner la fecha actual o la fecha de la transacción
            fechaInicial.setDate(1);
            //fechaInicial.setMonth(fechaInicial.getMonth() - 11);
            fechaInicial.setMonth(0);

            var fechaFinal = new Date(anio, mes, dia);
            var importe_neto_factura_proveedor_total = 0;

            var fechaInicialAUX = format.format({
                value: fechaInicial,
                type: format.Type.DATE,
                timezone: format.Timezone.AMERICA_BUENOS_AIRES
            });

            var fechaFinalAUX = format.format({
                value: fechaFinal,
                type: format.Type.DATE,
                timezone: format.Timezone.AMERICA_BUENOS_AIRES
            });

            //SAVE SEARCH A EJECUTAR
            var searchPPGanMonoTrib = search.load({
                id: "customsearch_l54_imp_ant_gan_monotrib"
            });

            //FILTRO PROVEEDOR
            if (!isEmpty(id_proveedor)) {
                var filtroProveedor = search.createFilter({
                    name: "entity",
                    operator: search.Operator.IS,
                    values: id_proveedor
                });
                searchPPGanMonoTrib.filters.push(filtroProveedor);
            }

            //FILTRO FECHA DESDE
            if (!isEmpty(fechaInicialAUX)) {

                var filtroFechaDesde = search.createFilter({
                    name: "trandate",
                    operator: search.Operator.ONORAFTER,
                    values: fechaInicialAUX
                });
                searchPPGanMonoTrib.filters.push(filtroFechaDesde);
            }

            //FILTRO FECHA HASTA
            if (!isEmpty(fechaFinalAUX)) {

                var filtroFechaHasta = search.createFilter({
                    name: "trandate",
                    operator: search.Operator.ONORBEFORE,
                    values: fechaFinalAUX
                });
                searchPPGanMonoTrib.filters.push(filtroFechaHasta);
            }

            //FILTRO CODIGO RETENCION GANANCIAS O SUSS
            if (!isEmpty(codigo_retencion)) {

                var filtroCodRetGAN = search.createFilter({
                    name: "custbody_l54_codigo_ret_" + tipoRetencion,
                    operator: search.Operator.IS,
                    values: codigo_retencion
                });
                searchPPGanMonoTrib.filters.push(filtroCodRetGAN);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {

                var filtroSubsidiaria = search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchPPGanMonoTrib.filters.push(filtroSubsidiaria);
            }

            var resultSearch = searchPPGanMonoTrib.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);


            if (!isEmpty(completeResultSet)) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    importe_neto_factura_proveedor_total = parseFloat(completeResultSet[i].getValue({
                        name: resultSearch.columns[0]/*,
                        summary: "sum"*/
                    }), 10);//IMPORTE
                }

                if (isEmpty(importe_neto_factura_proveedor_total) || (!isEmpty(importe_neto_factura_proveedor_total) && isNaN(importe_neto_factura_proveedor_total)))
                    importe_neto_factura_proveedor_total = 0;
            }
            else {
                log.error("L54 - Calculo Retenciones", "getImpPagosPasadosGanMonotributo - No se encuentro informacion para las bills con los parametros indicados");
            }

            if (isEmpty(importe_neto_factura_proveedor_total) || (!isEmpty(importe_neto_factura_proveedor_total) && isNaN(importe_neto_factura_proveedor_total)))
                importe_neto_factura_proveedor_total = 0;

            log.debug("L54 - Calculo Retenciones", "RETURN - importe_neto_factura_proveedor_total: " + parseFloat(importe_neto_factura_proveedor_total, 10).toFixedOK(2));
            log.audit("L54 - Calculo Retenciones", "FIN - getImpPagosPasadosGanMonotributo");
            return parseFloat(importe_neto_factura_proveedor_total, 10).toFixedOK(2);
        }

        //JSALAZAR 03/12/2019: Funcion que obtiene la base de cálculo de las retenciones de todos los pagos del proveedor en el periodo
        function getImpPagosPasadosCodRetencion(id_proveedor, id_periodo, subsidiaria, codigoRetencion, tipoRetencion, esAnualizada, fecha_pago) {

            try {
                log.audit("L54 - Calculo Retenciones", "INICIO - getImpPagosPasadosCodRetencion");
                log.debug("L54 - Calculo Retenciones", "Parámetros - id_proveedor: " + id_proveedor + " - id_periodo: " + id_periodo + " - subsidiaria: " + subsidiaria + " - codigoRetencion: " + codigoRetencion + " - tipoRetencion" + tipoRetencion + " - esAnualizada: " + esAnualizada + " - fecha_pago: " + fecha_pago);

                var informacionRetImpPasadoBaseCalculo = [];

                if (!isEmpty(codigoRetencion) && codigoRetencion.length > 0) {

                    //SAVE SEARCH A EJECUTAR
                    var searchPagosPasados = search.load({
                        id: "customsearch_l54_ret_calc_cod_ret"
                    });

                    //FILTRO PROVEEDOR
                    if (!isEmpty(id_proveedor)) {
                        var filtroProveedor = search.createFilter({
                            name: "custrecord_l54_ret_ref_proveedor",
                            operator: search.Operator.IS,
                            values: id_proveedor
                        });
                        searchPagosPasados.filters.push(filtroProveedor);
                    }

                    //FILTRO PERIODO O PERIODO DE ACUERDO A SI ES ANUALIZADA
                    if (esAnualizada) {

                        /* var trandateDate = format.parse({
                            value: fecha_pago,
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_BUENOS_AIRES // Montevideo - Uruguay
                        }); */

                        var trandateDate = fecha_pago;

                        var dia = trandateDate.getDate();
                        var mes = trandateDate.getMonth();
                        var anio = trandateDate.getFullYear();
                        var trandateDate = new Date(anio, mes, dia);

                        // Busco los Pagos Anteriores de Monotributo de la Misma Moneda
                        var fechaInicial = new Date(anio, mes, dia); // ver de poner la fecha actual o la fecha de la transacción
                        fechaInicial.setDate(1);
                        //fechaInicial.setMonth(fechaInicial.getMonth() - 11);
                        fechaInicial.setMonth(0);

                        var fechaFinal = new Date(anio, mes, dia);

                        var fechaInicialAUX = format.format({
                            value: fechaInicial,
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_BUENOS_AIRES
                        });

                        var fechaFinalAUX = format.format({
                            value: fechaFinal,
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_BUENOS_AIRES
                        });

                        //FILTRO FECHA DESDE
                        if (!isEmpty(fechaInicialAUX)) {

                            var filtroFechaDesde = search.createFilter({
                                name: "custrecord_l54_ret_fecha",
                                operator: search.Operator.ONORAFTER,
                                values: fechaInicialAUX
                            });
                            searchPagosPasados.filters.push(filtroFechaDesde);
                        }

                        //FILTRO FECHA HASTA
                        if (!isEmpty(fechaFinalAUX)) {

                            var filtroFechaHasta = search.createFilter({
                                name: "custrecord_l54_ret_fecha",
                                operator: search.Operator.ONORBEFORE,
                                values: fechaFinalAUX
                            });
                            searchPagosPasados.filters.push(filtroFechaHasta);
                        }
                    } else {
                        if (!isEmpty(id_periodo)) {
                            var filtroPeriodo = search.createFilter({
                                name: "custrecord_l54_ret_periodo",
                                operator: search.Operator.IS,
                                values: id_periodo
                            });
                            searchPagosPasados.filters.push(filtroPeriodo);
                        }
                    }

                    //FILTRO SUBSIDIARIA
                    if (!isEmpty(subsidiaria)) {
                        var filtroSubsidiaria = search.createFilter({
                            name: "custrecord_l54_ret_subsidiaria",
                            operator: search.Operator.IS,
                            values: subsidiaria
                        });
                        searchPagosPasados.filters.push(filtroSubsidiaria);
                    }

                    //FILTRO COD. RETENCION
                    if (!isEmpty(codigoRetencion)) {
                        var filtroCodigoRetencion = search.createFilter({
                            name: "custrecord_l54_ret_cod_retencion",
                            operator: search.Operator.ANYOF,
                            values: codigoRetencion
                        });
                        searchPagosPasados.filters.push(filtroCodigoRetencion);
                    }

                    var resultSearch = searchPagosPasados.run();
                    var completeResultSet = [];
                    var resultIndex = 0;
                    var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                    var resultado; // temporary variable used to store the result set

                    do {
                        // fetch one result set
                        resultado = resultSearch.getRange({
                            start: resultIndex,
                            end: resultIndex + resultStep
                        });

                        if (!isEmpty(resultado) && resultado.length > 0) {
                            if (resultIndex == 0)
                                completeResultSet = resultado;
                            else
                                completeResultSet = completeResultSet.concat(resultado);
                        }
                        //increase pointer
                        resultIndex = resultIndex + resultStep;

                        // once no records are returned we already got all of them
                    } while (!isEmpty(resultado) && resultado.length > 0);

                    if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                        for (var i = 0; i < completeResultSet.length; i++) {

                            informacionRetImpPasadoBaseCalculo[i] = {};

                            informacionRetImpPasadoBaseCalculo[i].codigoRetencion = parseFloat(completeResultSet[i].getValue({
                                name: resultSearch.columns[0]
                            }), 10);//CÓDIGO RETENCIÓN

                            informacionRetImpPasadoBaseCalculo[i].importe = parseFloat(completeResultSet[i].getValue({
                                name: resultSearch.columns[1]
                            }), 10);//BASE CÁLCULO - RETENCIONES PASADAS

                        }
                    }
                    else {
                        log.debug("L54 - Calculo Retenciones", "getImpPagosPasados - No se encuentro informacion de importe de pagos pasados para los parametros indicados");
                    }
                }

                log.debug("L54 - Calculo Retenciones", "RETURN - informacionRetImpPasadoBaseCalculo: " + JSON.stringify(informacionRetImpPasadoBaseCalculo));
                log.audit("L54 - Calculo Retenciones", "FIN - getImpPagosPasadosCodRetencion");
                return JSON.stringify(informacionRetImpPasadoBaseCalculo);
            } catch (e) {
                log.error("getImpPagosPasadosCodRetencion", "Error - getImpPagosPasadosCodRetencion - Excepcion Error: " + e.message);
            }
        }

        //JSALAZAR 03/12/2019: Funcion que obtiene el neto de todos las facturas del proveedor, en el periodo
        function getImpFacturasPagas(id_proveedor, fecha_pago, subsidiaria, codigoRetencion, tipoRetencion, esAnualizada, id_posting_period) {

            try {
                log.audit("L54 - Calculo Retenciones", "INICIO - getImpFacturasPagas");
                log.debug("L54 - Calculo Retenciones", "Parámetros - id_proveedor: " + id_proveedor + " - fecha_pago: " + fecha_pago + " - subsidiaria: " + subsidiaria + " - codigoRetencion: " + codigoRetencion + " - tipoRetencion" + tipoRetencion + " - esAnualizada: " + esAnualizada);

                var informacionPagoPasados = [];

                if (!isEmpty(codigoRetencion) && codigoRetencion.length > 0) {

                    //SAVE SEARCH A EJECUTAR
                    var searchPagosPasados = search.load({
                        id: "customsearch_l54_bill_net_amt_bas_ca_c_r"
                    });

                    //FILTRO PROVEEDOR
                    if (!isEmpty(id_proveedor)) {
                        var filtroProveedor = search.createFilter({
                            name: "entity",
                            operator: search.Operator.IS,
                            values: id_proveedor
                        });
                        searchPagosPasados.filters.push(filtroProveedor);
                    }

                    //FILTRO PERIODO O PERIODO DE ACUERDO A SI ES ANUALIZADA
                    if (esAnualizada) {
                        if (!isEmpty(fecha_pago)) {

                            var trandateDate = fecha_pago;

                            var dia = trandateDate.getDate();
                            var mes = trandateDate.getMonth();
                            var anio = trandateDate.getFullYear();
                            var trandateDate = new Date(anio, mes, dia);

                            // Busco los Pagos Anteriores de Monotributo de la Misma Moneda
                            var fechaInicial = new Date(anio, mes, dia); // ver de poner la fecha actual o la fecha de la transacción
                            fechaInicial.setDate(1);
                            //fechaInicial.setMonth(fechaInicial.getMonth() - 11);
                            fechaInicial.setMonth(0);

                            var fechaFinal = new Date(anio, mes, dia);

                            var fechaInicialAUX = format.format({
                                value: fechaInicial,
                                type: format.Type.DATE,
                                timezone: format.Timezone.AMERICA_BUENOS_AIRES
                            });

                            var fechaFinalAUX = format.format({
                                value: fechaFinal,
                                type: format.Type.DATE,
                                timezone: format.Timezone.AMERICA_BUENOS_AIRES
                            });

                            //FILTRO FECHA DESDE
                            if (!isEmpty(fechaInicialAUX)) {

                                var filtroFechaDesde = search.createFilter({
                                    name: "trandate",
                                    join: "payingtransaction",
                                    operator: search.Operator.ONORAFTER,
                                    values: fechaInicialAUX
                                });
                                searchPagosPasados.filters.push(filtroFechaDesde);
                            }

                            //FILTRO FECHA HASTA
                            if (!isEmpty(fechaFinalAUX)) {

                                var filtroFechaHasta = search.createFilter({
                                    name: "trandate",
                                    join: "payingtransaction",
                                    operator: search.Operator.ONORBEFORE,
                                    values: fechaFinalAUX
                                });
                                searchPagosPasados.filters.push(filtroFechaHasta);
                            }

                        }
                    } else {
                        log.debug("Posting period", id_posting_period)
                        var filtroFechaHasta = search.createFilter({
                            name: "postingperiod",
                            join: "payingtransaction",
                            operator: search.Operator.IS,
                            values: id_posting_period
                        });
                        searchPagosPasados.filters.push(filtroFechaHasta);

                        /*if (!isEmpty(fecha_pago)) {


                            var trandateDate = fecha_pago;

                            var dia = trandateDate.getDate();
                            var mes = trandateDate.getMonth();
                            var anio = trandateDate.getFullYear();
                            var trandateDate = new Date(anio, mes, dia);

                            var fechaInicial = new Date(anio, mes, dia); // ver de poner la fecha actual o la fecha de la transacción
                            fechaInicial.setDate(1);

                            var fechaFinal = new Date(anio, mes, dia);

                            var fechaInicialAUX = format.format({
                                value: fechaInicial,
                                type: format.Type.DATE,
                                timezone: format.Timezone.AMERICA_BUENOS_AIRES
                            });

                            var fechaFinalAUX = format.format({
                                value: fechaFinal,
                                type: format.Type.DATE,
                                timezone: format.Timezone.AMERICA_BUENOS_AIRES
                            });

                            //FILTRO FECHA DESDE
                            if (!isEmpty(fechaInicialAUX)) {

                                var filtroFechaDesde = search.createFilter({
                                    name: "trandate",
                                    join: "payingtransaction",
                                    operator: search.Operator.ONORAFTER,
                                    values: fechaInicialAUX
                                });
                                searchPagosPasados.filters.push(filtroFechaDesde);
                            }

                            //FILTRO FECHA HASTA
                            if (!isEmpty(fechaFinalAUX)) {

                                var filtroFechaHasta = search.createFilter({
                                    name: "trandate",
                                    join: "payingtransaction",
                                    operator: search.Operator.ONORBEFORE,
                                    values: fechaFinalAUX
                                });
                                searchPagosPasados.filters.push(filtroFechaHasta);
                            }

                        }
                        */
                    }



                    //FILTRO SUBSIDIARIA
                    if (!isEmpty(subsidiaria)) {
                        var filtroSubsidiaria = search.createFilter({
                            name: "subsidiary",
                            operator: search.Operator.IS,
                            values: subsidiaria
                        });
                        searchPagosPasados.filters.push(filtroSubsidiaria);
                    }

                    if (!isEmpty(codigoRetencion)) {
                        var filtroCodigoRetencion = search.createFilter({
                            name: "custbody_l54_codigo_ret_" + tipoRetencion,
                            operator: search.Operator.ANYOF,
                            values: codigoRetencion
                        });
                        searchPagosPasados.filters.push(filtroCodigoRetencion);
                    }

                    var resultSearch = searchPagosPasados.run();
                    var completeResultSet = [];
                    var resultIndex = 0;
                    var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                    var resultado; // temporary variable used to store the result set

                    do {
                        // fetch one result set
                        resultado = resultSearch.getRange({
                            start: resultIndex,
                            end: resultIndex + resultStep
                        });

                        if (!isEmpty(resultado) && resultado.length > 0) {
                            if (resultIndex == 0)
                                completeResultSet = resultado;
                            else
                                completeResultSet = completeResultSet.concat(resultado);
                        }
                        //increase pointer
                        resultIndex = resultIndex + resultStep;

                        // once no records are returned we already got all of them
                    } while (!isEmpty(resultado) && resultado.length > 0);

                    //log.debug("L54 - Calcular Retenciones - LINE 4307", "completeResultSet: " + JSON.stringify(completeResultSet));

                    if ((!isEmpty(completeResultSet)) && (completeResultSet.length > 0)) {
                        for (var i = 0; i < completeResultSet.length; i++) {

                            informacionPagoPasados[i] = {};

                            informacionPagoPasados[i].idInterno = completeResultSet[i].getValue({
                                name: resultSearch.columns[1]
                            });

                            informacionPagoPasados[i].importe = completeResultSet[i].getValue({
                                name: resultSearch.columns[4]
                            });//BASE CALCULO - FACTURAS PASADAS

                            informacionPagoPasados[i].codigoRetGanancias = completeResultSet[i].getValue({
                                name: resultSearch.columns[5]
                            });//CODIGO RETENCION GANANCIAS

                            informacionPagoPasados[i].codigoRetIVA = completeResultSet[i].getValue({
                                name: resultSearch.columns[6]
                            });//CODIGO RETENCION IVA

                            informacionPagoPasados[i].codigoRetSUSS = completeResultSet[i].getValue({
                                name: resultSearch.columns[7]
                            });//CODIGO RETENCION SUSS
                        }
                    }
                    else {
                        log.debug("L54 - Calculo Retenciones", "getImpPagosPasados - No se encuentro informacion de importe de pagos pasados para los parametros indicados");
                    }
                }

                log.debug("L54 - Calculo Retenciones", "RETURN - importePagosPasados: " + JSON.stringify(informacionPagoPasados));
                log.audit("L54 - Calculo Retenciones", "FIN - getImpFacturasPagas");
                return JSON.stringify(informacionPagoPasados);
            } catch (e) {
                log.error("getImpFacturasPagas", "Error - getImpFacturasPagas - Excepcion Error: " + e.message);
            }

        }

        //ABRITO 13/11/2018: Funcion que obtiene el neto de todos los pagos del proveedor, en el periodo, sin importar si tuvo retenciones o no
        function getImpPagosPasados(id_proveedor, id_periodo, subsidiaria) {

            log.audit("L54 - Calculo Retenciones", "INICIO - getImpPagosPasados");
            log.debug("L54 - Calculo Retenciones", "Parámetros - id_proveedor: " + id_proveedor + " - id_periodo: " + id_periodo + " - subsidiaria: " + subsidiaria);

            var importePagosPasados = 0;

            //SAVE SEARCH A EJECUTAR
            var searchPagosPasados = search.load({
                id: "customsearch_vendorpayment_retbase_nuevo"
            });

            //FILTRO PROVEEDOR
            if (!isEmpty(id_proveedor)) {
                var filtroProveedor = search.createFilter({
                    name: "entity",
                    operator: search.Operator.IS,
                    values: id_proveedor
                });
                searchPagosPasados.filters.push(filtroProveedor);
            }

            //FILTRO PERIODO
            if (!isEmpty(id_periodo)) {
                var filtroPeriodo = search.createFilter({
                    name: "postingperiod",
                    operator: search.Operator.IS,
                    values: id_periodo
                });
                searchPagosPasados.filters.push(filtroPeriodo);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchPagosPasados.filters.push(filtroSubsidiaria);
            }

            var resultSearch = searchPagosPasados.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);

            //log.debug("L54 - Calcular Retenciones (SS) - LINE 2879","completeResultSet: "+ JSON.stringify(completeResultSet));

            if (!isEmpty(completeResultSet)) {
                if (completeResultSet.length > 0) {
                    importePagosPasados = parseFloat(completeResultSet[0].getValue({
                        name: resultSearch.columns[1]
                    }), 10);//IMPORTE PAGOS PASADOS

                    //log.debug("L54 - Calcular Retenciones (SS) - LINE 2886","importePagosPasados: "+ importePagosPasados);

                    if (isEmpty(importePagosPasados) || (!isEmpty(importePagosPasados) && isNaN(importePagosPasados)))
                        importePagosPasados = 0;
                }
            }
            else {
                log.debug("L54 - Calculo Retenciones", "getImpPagosPasados - No se encuentro informacion de importe de pagos pasados para los parametros indicados");
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - importePagosPasados: " + parseFloat(importePagosPasados, 10).toFixedOK(2));
            log.audit("L54 - Calculo Retenciones", "FIN - getImpPagosPasados");
            return parseFloat(importePagosPasados, 10).toFixedOK(2);
        }


        function obtenerPuntoVenta(esND, subsidiaria, tipoTransStr, locationId) {
            log.audit("L54 - Calculo Retenciones", "INICIO - obtenerPuntoVenta");
            log.debug("L54 - Calculo Retenciones", "Parámetros - esND: " + esND + " - subsidiaria: " + subsidiaria + " - tipoTransStr: " + tipoTransStr + " - locationId: " + locationId);

            var categoriaNumerador = null;
            var resultgetTipoTransId = getTipoTransId(tipoTransStr);
            var tipoTransId = numeradorAUtilizar(resultgetTipoTransId, esND, subsidiaria);

            if (!isEmpty(locationId)) {
                var fieldLookUp = search.lookupFields({
                    type: search.Type.LOCATION,
                    id: locationId,
                    columns: ["custrecord_l54_loc_categoria_numerador"]
                });

                if (!isEmpty(fieldLookUp))
                    categoriaNumerador = fieldLookUp.custrecord_l54_loc_categoria_numerador;
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - getBocaPreferidaParaTrans: " + getBocaPreferidaParaTrans(tipoTransId, subsidiaria, categoriaNumerador));
            log.audit("L54 - Calculo Retenciones", "FIN - obtenerPuntoVenta");
            return getBocaPreferidaParaTrans(tipoTransId, subsidiaria, categoriaNumerador);
        }


        function numeradorAUtilizar(tipoTransNetSuite, esND, subsidiaria) {

            log.audit("L54 - Calculo Retenciones", "INICIO - numeradorAUtilizar");
            log.debug("L54 - Calculo Retenciones", "Parámetros - esND: " + esND + " - subsidiaria: " + subsidiaria + " - tipoTransNetSuite: " + tipoTransNetSuite);

            //SI VIENE NULL SE LE ASIGNA VALOR FALSE
            if (isEmpty(esND))
                esND = false;

            //SAVE SEARCH A EJECUTAR
            var saveSearch = search.load({
                id: "customsearch_l54_num_transac_cal_ret"
            });

            //FILTRO TIPO TRANSACCION NS
            if (!isEmpty(tipoTransNetSuite)) {
                var filtroTipoTransNS = search.createFilter({
                    name: "custrecord_l54_tipo_trans_netsuite",
                    operator: search.Operator.IS,
                    values: tipoTransNetSuite
                });
                saveSearch.filters.push(filtroTipoTransNS);
            }

            //FILTRO ES NOTA DE DEBITO?
            if (!isEmpty(esND)) {
                var filtroND = search.createFilter({
                    name: "custrecord_l54_es_nd",
                    operator: search.Operator.IS,
                    values: esND
                });
                saveSearch.filters.push(filtroND);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "custrecord_l54_num_trans_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                saveSearch.filters.push(filtroSubsidiaria);
            }

            var resultSearch = saveSearch.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);

            if (!isEmpty(completeResultSet)) {
                if (completeResultSet.length > 0) {
                    var numerador = completeResultSet[0].getValue({
                        name: resultSearch.columns[1]
                    });
                    log.debug("L54 - Calculo Retenciones", "RETURN - numerador: " + numerador);
                    return numerador;
                }
            }
            else {
                log.debug("L54 - Calculo Retenciones", "RETURN - null");
                return null;
            }
            log.audit("L54 - Calculo Retenciones", "FIN - numeradorAUtilizar");
            return null;
        }


        function getTipoTransId(tipoTransStr) {
            log.audit("L54 - Calculo Retenciones", "INICIO - getTipoTransId");
            log.debug("L54 - Calculo Retenciones", "Parámetros - tipoTransStr: " + tipoTransStr);

            if (!isEmpty(tipoTransStr)) {

                var saveSearch = search.create({
                    type: "customlist_l54_tipo_transaccion",
                    columns: [{
                        name: "internalId"
                    }],
                    filters: [{
                        name: "name",
                        operator: "is",
                        values: tipoTransStr
                    }]
                });

                var resultSearch = saveSearch.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!isEmpty(resultado) && resultado.length > 0);

                //log.debug("getTipoTransId","LINE 3550 - completeResultSet: "+JSON.stringify(completeResultSet));
                if (!isEmpty(completeResultSet)) {
                    if (completeResultSet.length > 0) {
                        var internalId = completeResultSet[0].getValue({
                            name: resultSearch.columns[0]
                        });
                        log.debug("L54 - Calculo Retenciones", "RETURN - internalId: " + internalId);
                        return internalId;
                    }
                }
                else {
                    log.error("L54 - Calculo Retenciones", "getTipoTransId - No se encuentro el tipo de transaccion con los parametros indicados");
                    log.debug("L54 - Calculo Retenciones", "RETURN - null");
                    log.audit("L54 - Calculo Retenciones", "FIN - getTipoTransId");
                    return null;
                }
            }
            return null;
        }


        function getBocaPreferidaParaTrans(tipoTransId, subsidiaria, categoriaNumerador) {
            log.audit("L54 - Calculo Retenciones", "INICIO - getBocaPreferidaParaTrans");
            log.debug("L54 - Calculo Retenciones", "Parámetros - tipoTransId: " + tipoTransId + "- subsidiaria: " + subsidiaria + " - categoriaNumerador: " + categoriaNumerador);
            var i = 0;

            if (isEmpty(tipoTransId))
                return 1;

            //SAVE SEARCH A EJECUTAR
            var saveSearch = search.load({
                id: "customsearch_l54_numeradores_cal_ret"
            });

            //FILTRO TIPO TRANSACCION
            if (!isEmpty(tipoTransId)) {
                var filtroTipoTrans = search.createFilter({
                    name: "custrecord_l54_num_tipo_trans",
                    operator: search.Operator.ANYOF,
                    values: tipoTransId
                });
                saveSearch.filters.push(filtroTipoTrans);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "custrecord_l54_num_subsidiaria",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                saveSearch.filters.push(filtroSubsidiaria);
            }

            //FILTRO PREFERIDO
            var filtroPreferido = search.createFilter({
                name: "custrecord_l54_num_preferido",
                operator: search.Operator.IS,
                values: true
            });
            saveSearch.filters.push(filtroPreferido);

            var objDatosImpositivos = consultaDatosImpositivos(subsidiaria);
            var numXLocation = false;
            var numXLocation = objDatosImpositivos[0].numXLocation;
            //log.debug("getBocaPreferidaParaTrans","LINE 3618 - numXLocation: "+numXLocation);

            //Si la empresa utiliza numeracion por location, filtro categoria de numerador
            if (numXLocation) {
                if (isEmpty(categoriaNumerador))
                    categoriaNumerador = "@NONE@";
            }
            else {
                categoriaNumerador = "@NONE@"; //Como la empresa no utiliza numerador por location, busco el numerador sin categoria
            }

            //FILTRO CATEGORIA NUMERADOR
            if (!isEmpty(categoriaNumerador)) {
                var filtroCatNumerador = search.createFilter({
                    name: "custrecord_l54_num_categoria_numerador",
                    operator: search.Operator.IS,
                    values: categoriaNumerador
                });
                saveSearch.filters.push(filtroCatNumerador);
            }

            var resultSearch = saveSearch.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);

            //log.debug("getBocaPreferidaParaTrans","LINE 3667 - completeResultSet: "+JSON.stringify(completeResultSet));
            if (!isEmpty(completeResultSet)) {
                if (completeResultSet.length > 0) {
                    var boca = completeResultSet[0].getValue({
                        name: resultSearch.columns[0]
                    });
                    log.debug("L54 - Calculo Retenciones", "RETURN - boca: " + boca);
                    log.audit("L54 - Calculo Retenciones", "FIN - getBocaPreferidaParaTrans");
                    return boca;
                }
            }
            else {
                log.error("L54 - Calculo Retenciones", "getBocaPreferidaParaTrans - No se encuentro informacion de numeradores con los parametros recibidos");
                log.debug("L54 - Calculo Retenciones", "RETURN 1");
                log.audit("L54 - Calculo Retenciones", "FIN - getBocaPreferidaParaTrans");
                return 1;
            }
            log.debug("L54 - Calculo Retenciones", "RETURN 1");
            return 1; // Boca default: 0001
        }


        function getLetraId(letraStr) {
            log.audit("L54 - Calculo Retenciones", "INICIO - getLetraId");
            log.debug("L54 - Calculo Retenciones", "Parámetros - letraStr: " + letraStr);

            var letraId = null;

            if (letraStr == "A")
                letraId = 1;
            else if (letraStr == "B")
                letraId = 2;
            else if (letraStr == "C")
                letraId = 3;
            else if (letraStr == "E")
                letraId = 4;
            else if (letraStr == "R")
                letraId = 5;
            else if (letraStr == "X")
                letraId = 6;

            log.debug("L54 - Calculo Retenciones", "RETURN - letraId: " + letraId);
            log.audit("L54 - Calculo Retenciones", "FIN - getLetraId");
            return letraId;
        }


        function devolverNuevoNumero(tipoTransId, boca, letra, subsidiaria, jurisdiccion) {

            log.audit("L54 - Calculo Retenciones", "INICIO - devolverNuevoNumero");
            log.debug("L54 - Calculo Retenciones", "Parámetros - tipoTransId: " + tipoTransId + ", boca: " + boca + ", letra: " + letra + ", subsidiaria: " + subsidiaria + ", jurisdiccion: " + jurisdiccion);

            if (!isEmpty(tipoTransId) && !isEmpty(boca) && !isEmpty(letra)) {

                var numeradorElectronico = false;
                var tipoMiddleware = 1;
                var tipoTransaccionAFIP = "";
                var idInternoNumerador = "";

                //SAVE SEARCH A EJECUTAR
                var saveSearch = search.load({
                    id: "customsearch_l54_numeradores_cal_ret"
                });
                //FILTRO TIPO TRANSACCION
                if (!isEmpty(tipoTransId)) {
                    var filtroTipoTrans = search.createFilter({
                        name: "custrecord_l54_num_tipo_trans",
                        operator: search.Operator.ANYOF,
                        values: tipoTransId
                    });
                    saveSearch.filters.push(filtroTipoTrans);
                }
                //FILTRO BOCA
                if (!isEmpty(boca)) {
                    var filtroBoca = search.createFilter({
                        name: "custrecord_l54_num_boca",
                        operator: search.Operator.ANYOF,
                        values: boca
                    });
                    saveSearch.filters.push(filtroBoca);
                }
                //FILTRO LETRA
                if (!isEmpty(letra)) {
                    var filtroLetra = search.createFilter({
                        name: "custrecord_l54_num_letra",
                        operator: search.Operator.ANYOF,
                        values: letra
                    });
                    saveSearch.filters.push(filtroLetra);
                }
                //FILTRO SUBSIDIARIA
                if (!isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "custrecord_l54_num_subsidiaria",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    saveSearch.filters.push(filtroSubsidiaria);
                }
                //FILTRO JURISDICCION
                if (!isEmpty(jurisdiccion)) {
                    var filtroJurisdiccion = search.createFilter({
                        name: "custrecord_l54_num_jurisdiccion",
                        operator: search.Operator.IS,
                        values: jurisdiccion
                    });
                    saveSearch.filters.push(filtroJurisdiccion);
                }

                var resultSearch = saveSearch.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!isEmpty(resultado) && resultado.length > 0);

                if (!isEmpty(completeResultSet)) {
                    if (completeResultSet.length > 0) {
                        var numerador = completeResultSet[0].getValue({ name: resultSearch.columns[1] });
                        var numeradorInicial = completeResultSet[0].getValue({ name: resultSearch.columns[2] });
                        var numeradorLong = completeResultSet[0].getValue({ name: resultSearch.columns[3] });
                        var numeradorPrefijo = completeResultSet[0].getValue({ name: resultSearch.columns[4] });
                        numeradorElectronico = completeResultSet[0].getValue({ name: resultSearch.columns[5] });
                        tipoMiddleware = completeResultSet[0].getValue({ name: resultSearch.columns[6] });
                        tipoTransaccionAFIP = completeResultSet[0].getValue({ name: resultSearch.columns[7] });
                        idInternoNumerador = completeResultSet[0].getValue({ name: resultSearch.columns[8] });
                        var recId = completeResultSet[0].getValue({ name: resultSearch.columns[8] });
                    }
                }
                else {
                    log.error("L54 - Calculo Retenciones", "devolverNuevoNumero - No se encuentro informacion de numeradores con los parametros recibidos");
                    log.debug("L54 - Calculo Retenciones", "RETURN 1");
                    log.audit("L54 - Calculo Retenciones", "FIN - devolverNuevoNumero");
                    return 1;
                }

                if (!isEmpty(numeradorElectronico) && (numeradorElectronico == "T" || numeradorElectronico == true)) {
                    // Si es Numerador Electronico
                    var numeradorArray = new Array();
                    numeradorArray["referencia"] = idInternoNumerador;
                    numeradorArray["numerador"] = ""; // numerador
                    numeradorArray["numeradorPrefijo"] = ""; // prefijo + numerador
                    numeradorArray["numeradorElectronico"] = "T";
                    numeradorArray["tipoTransAFIP"] = tipoTransaccionAFIP;
                    log.debug("L54 - Calculo Retenciones", "RETURN - numeradorArray: " + JSON.stringify(numeradorArray));
                    log.audit("L54 - Calculo Retenciones", "FIN - devolverNuevoNumero");
                    return numeradorArray;
                }
                else {
                    if (isEmpty(numerador)) {
                        //nlapiSubmitField("customrecord_l54_numeradores", recId, ["custrecord_l54_num_numerador"], [parseInt(numeradorInicial) + 1]);
                        var contador = parseInt(numeradorInicial) + 1;

                        record.submitFields({
                            type: "customrecord_l54_numeradores",
                            id: recId,
                            values: {
                                custrecord_l54_num_numerador: contador
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                        numerador = numeradorInicial;
                    }
                    else {
                        //nlapiSubmitField("customrecord_l54_numeradores", recId, ["custrecord_l54_num_numerador"], [parseInt(numerador) + 1]);
                        var contador = parseInt(numerador) + 1;
                        record.submitFields({
                            type: "customrecord_l54_numeradores",
                            id: recId,
                            values: {
                                custrecord_l54_num_numerador: contador
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    }
                    var numerador = zeroFill(numerador, numeradorLong);

                    if (!isEmpty(numeradorPrefijo)) {
                        var numeradorArray = new Array();
                        numeradorArray["referencia"] = idInternoNumerador;
                        numeradorArray["numerador"] = numerador.toString(); // numerador
                        numeradorArray["numeradorPrefijo"] = numeradorPrefijo.toString() + numerador.toString(); // prefijo + numerador
                        numeradorArray["numeradorElectronico"] = "F";
                        numeradorArray["tipoTransAFIP"] = tipoTransaccionAFIP;
                        log.debug("L54 - Calculo Retenciones", "RETURN - numeradorArray: " + JSON.stringify(numeradorArray));
                        log.audit("L54 - Calculo Retenciones", "FIN - devolverNuevoNumero");
                        return numeradorArray;
                    } else {

                        var numeradorArray = new Array();
                        numeradorArray["referencia"] = idInternoNumerador;
                        numeradorArray["numerador"] = numerador.toString(); // numerador
                        numeradorArray["numeradorPrefijo"] = numerador.toString(); // prefijo + numerador
                        numeradorArray["numeradorElectronico"] = "F";
                        numeradorArray["tipoTransAFIP"] = tipoTransaccionAFIP;
                        log.debug("L54 - Calculo Retenciones", "RETURN - numeradorArray: " + JSON.stringify(numeradorArray));
                        log.audit("L54 - Calculo Retenciones", "FIN - devolverNuevoNumero");
                        return numeradorArray;
                    }
                }
            } else {
                var numeradorArray = new Array();
                numeradorArray["referencia"] = idInternoNumerador;
                numeradorArray["numerador"] = ""; // numerador
                numeradorArray["numeradorPrefijo"] = ""; // prefijo + numerador
                numeradorArray["numeradorElectronico"] = "F";
                numeradorArray["tipoTransAFIP"] = "";
                log.debug("L54 - Calculo Retenciones", "RETURN - numeradorArray: " + JSON.stringify(numeradorArray));
                log.audit("L54 - Calculo Retenciones", "FIN - devolverNuevoNumero");
                return numeradorArray;
            }
        }


        function letras(c, d, u) {

            log.audit("L54 - Calculo Retenciones", "INICIO - letras");
            log.debug("L54 - Calculo Retenciones", "Parámetros - c: " + c + ", d: " + d + ", u: " + u);

            var centenas,
                decenas,
                decom;
            var lc = "";
            var ld = "";
            var lu = "";
            centenas = eval(c);
            decenas = eval(d);
            decom = eval(u);

            switch (centenas) {

                case 0:
                    lc = "";
                    break;
                case 1: {
                    if (decenas == 0 && decom == 0)
                        lc = "CIEN";
                    else
                        lc = "CIENTO ";
                }
                    break;
                case 2:
                    lc = "DOSCIENTOS ";
                    break;
                case 3:
                    lc = "TRESCIENTOS ";
                    break;
                case 4:
                    lc = "CUATROCIENTOS ";
                    break;
                case 5:
                    lc = "QUINIENTOS ";
                    break;
                case 6:
                    lc = "SEISCIENTOS ";
                    break;
                case 7:
                    lc = "SETECIENTOS ";
                    break;
                case 8:
                    lc = "OCHOCIENTOS ";
                    break;
                case 9:
                    lc = "NOVECIENTOS ";
                    break;
            }

            switch (decenas) {

                case 0:
                    ld = "";
                    break;
                case 1: {
                    switch (decom) {

                        case 0:
                            ld = "DIEZ";
                            break;
                        case 1:
                            ld = "ONCE";
                            break;
                        case 2:
                            ld = "DOCE";
                            break;
                        case 3:
                            ld = "TRECE";
                            break;
                        case 4:
                            ld = "CATORCE";
                            break;
                        case 5:
                            ld = "QUINCE";
                            break;
                        case 6:
                            ld = "DIECISEIS";
                            break;
                        case 7:
                            ld = "DIECISIETE";
                            break;
                        case 8:
                            ld = "DIECIOCHO";
                            break;
                        case 9:
                            ld = "DIECINUEVE";
                            break;
                    }
                }
                    break;
                case 2:
                    ld = "VEINTE";
                    break;
                case 3:
                    ld = "TREINTA";
                    break;
                case 4:
                    ld = "CUARENTA";
                    break;
                case 5:
                    ld = "CINCUENTA";
                    break;
                case 6:
                    ld = "SESENTA";
                    break;
                case 7:
                    ld = "SETENTA";
                    break;
                case 8:
                    ld = "OCHENTA";
                    break;
                case 9:
                    ld = "NOVENTA";
                    break;
            }
            switch (decom) {

                case 0:
                    lu = "";
                    break;
                case 1:
                    lu = "UN";
                    break;
                case 2:
                    lu = "DOS";
                    break;
                case 3:
                    lu = "TRES";
                    break;
                case 4:
                    lu = "CUATRO";
                    break;
                case 5:
                    lu = "CINCO";
                    break;
                case 6:
                    lu = "SEIS";
                    break;
                case 7:
                    lu = "SIETE";
                    break;
                case 8:
                    lu = "OCHO";
                    break;
                case 9:
                    lu = "NUEVE";
                    break;
            }

            if (decenas == 1) {
                log.debug("L54 - Calculo Retenciones", "RETURN - lc + ld: " + lc + ld);
                log.audit("L54 - Calculo Retenciones", "FIN - letras");
                return lc + ld;
            }
            if (decenas == 0 || decom == 0) {

                //return lc+" "+ld+lu;
                log.debug("L54 - Calculo Retenciones", "RETURN - lc + ld + lu: " + lc + ld + lu);
                log.audit("L54 - Calculo Retenciones", "FIN - letras");
                return lc + ld + lu;
            } else {

                if (decenas == 2) {
                    ld = "VEINTI";
                    log.debug("L54 - Calculo Retenciones", "RETURN - lc + ld + lu.toLowerCase(): " + lc + ld + lu.toLowerCase());
                    log.audit("L54 - Calculo Retenciones", "FIN - letras");
                    return lc + ld + lu.toLowerCase();
                } else {
                    log.debug("L54 - Calculo Retenciones", "RETURN - lc + ld + \" Y \" + lu: " + lc + ld + " Y " + lu);
                    log.audit("L54 - Calculo Retenciones", "FIN - letras");
                    return lc + ld + " Y " + lu;
                }
            }
        }


        function getNumberLiteral(n) {

            log.audit("L54 - Calculo Retenciones", "INICIO - getNumberLiteral");
            log.debug("L54 - Calculo Retenciones", "Parámetros - n: " + n);

            var m0,
                cm,
                dm,
                um,
                cmi,
                dmi,
                umi,
                ce,
                de,
                un,
                hlp,
                decimal;

            if (isNaN(n)) {

                alert("La Cantidad debe ser un valor NumÃ©rico.");
                log.debug("L54 - Calculo Retenciones", "RETURN - null");
                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return null;
            }
            m0 = parseInt(n / 1000000000000);
            rm0 = n % 1000000000000;
            m1 = parseInt(rm0 / 100000000000);
            rm1 = rm0 % 100000000000;
            m2 = parseInt(rm1 / 10000000000);
            rm2 = rm1 % 10000000000;
            m3 = parseInt(rm2 / 1000000000);
            rm3 = rm2 % 1000000000;
            cm = parseInt(rm3 / 100000000);
            r1 = rm3 % 100000000;
            dm = parseInt(r1 / 10000000);
            r2 = r1 % 10000000;
            um = parseInt(r2 / 1000000);
            r3 = r2 % 1000000;
            cmi = parseInt(r3 / 100000);
            r4 = r3 % 100000;
            dmi = parseInt(r4 / 10000);
            r5 = r4 % 10000;
            umi = parseInt(r5 / 1000);
            r6 = r5 % 1000;
            ce = parseInt(r6 / 100);
            r7 = r6 % 100;
            de = parseInt(r7 / 10);
            r8 = r7 % 10;
            un = parseInt(r8 / 1);

            //r9=r8%1;
            999123456789;
            if (n < 1000000000000 && n >= 1000000000) {

                tmp = n.toString();
                s = tmp.length;
                tmp1 = tmp.slice(0, s - 9);
                tmp2 = tmp.slice(s - 9, s);

                tmpn1 = getNumberLiteral(tmp1);
                tmpn2 = getNumberLiteral(tmp2);

                if (tmpn1.indexOf("Un") >= 0)
                    pred = " BILLÃ“N ";
                else
                    pred = " BILLONES ";

                log.debug("L54 - Calculo Retenciones", "RETURN: " + tmpn1 + pred + tmpn2);
                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return tmpn1 + pred + tmpn2;
            }

            if (n < 10000000000 && n >= 1000000) {

                mldata = letras(cm, dm, um);
                hlp = mldata.replace("UN", "*");
                if (hlp.indexOf("*") < 0 || hlp.indexOf("*") > 3) {

                    mldata = mldata.replace("UNO", "UN");
                    mldata += " MILLONES ";
                } else
                    mldata = "UN MILLÃ“N ";

                mdata = letras(cmi, dmi, umi);
                cdata = letras(ce, de, un);

                if (mdata != "  ") {
                    if (n == 1000000)
                        mdata = mdata.replace("UNO", "UN") + "DE";
                    else
                        mdata = mdata.replace("UNO", "UN") + " MIL ";
                }

                log.debug("L54 - Calculo Retenciones", "RETURN: " + mldata + mdata + cdata);
                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return (mldata + mdata + cdata);
            }
            if (n < 1000000 && n >= 1000) {

                mdata = letras(cmi, dmi, umi);
                cdata = letras(ce, de, un);
                hlp = mdata.replace("UN", "*");
                if (hlp.indexOf("*") < 0 || hlp.indexOf("*") > 3) {

                    mdata = mdata.replace("UNO", "UN");
                    log.debug("L54 - Calculo Retenciones", "RETURN: " + mdata + " MIL " + cdata);
                    log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                    return (mdata + " MIL " + cdata);
                } else
                    log.debug("L54 - Calculo Retenciones", "RETURN: UN MIL " + cdata);
                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return ("UN MIL " + cdata);
            }
            if (n < 1000 && n >= 1) {

                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return (letras(ce, de, un));
            }

            if (n == 0) {

                log.debug("L54 - Calculo Retenciones", "RETURN CERO");
                log.audit("L54 - Calculo Retenciones", "FIN - getNumberLiteral");
                return " CERO";
            }

            return "NO DISPONIBLE";
        }

        function getNumeroEnLetras(numero) {
            log.audit("L54 - Calculo Retenciones", "INICIO - getNumeroEnLetras");
            log.debug("L54 - Calculo Retenciones", "Parámetros - numero: " + numero);

            if (!isEmpty(numero)) {

                //var currency_name = "PESOS";
                var partes = numero.split(".");
                var parteEntera = partes[0];
                var parteDecimal = partes[1];
                var parteEnteraLetras = "";

                // convierto la parte entera en letras
                parteEnteraLetras = getNumberLiteral(parteEntera);
                // le hago un TRIM a la parte entera en letras
                parteEnteraLetras = parteEnteraLetras.replace(/^\s*|\s*$/g, "");

                var numeroEnLetras = "Son " + parteEnteraLetras + " con " + parteDecimal;

                // dejo toda la palabra en mayusculas
                numeroEnLetras = numeroEnLetras.toUpperCase();

                // le agrego MN (Moneda Nacional) al final
                numeroEnLetras = numeroEnLetras + "/100";
                log.debug("L54 - Calculo Retenciones", "RETURN - numeroEnLetras: " + numeroEnLetras);
                log.audit("L54 - Calculo Retenciones", "FIN - getNumeroEnLetras");

                return numeroEnLetras;
            }
            log.debug("L54 - Calculo Retenciones", "RETURN  NULL");
            log.audit("L54 - Calculo Retenciones", "FIN - getNumeroEnLetras");
            return NULL;
        }


        function obtenerCuentaIIBB(subsidiaria, jurisdiccionIIBB) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtenerCuentaIIBB");
            log.debug("L54 - Calculo Retenciones", "Parámetros - subsidiaria:" + subsidiaria + ",jurisdiccionIIBB:" + jurisdiccionIIBB);

            var idCuenta = 0;
            var idConfGeneral = null;
            if (!isEmpty(jurisdiccionIIBB)) {
                //SAVE SEARCH A EJECUTAR
                var saveSearch = search.load({
                    id: "customsearch_l54_pv_iibb_config_general"
                });
                //FILTRO SUBSIDIARIA
                if (!isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "custrecord_l54_pv_gral_subsidiaria",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    saveSearch.filters.push(filtroSubsidiaria);
                }

                var resultSearch = saveSearch.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!isEmpty(resultado) && resultado.length > 0);

                if (!isEmpty(completeResultSet)) {
                    if (completeResultSet.length > 0) {
                        idConfGeneral = completeResultSet[0].getValue({ name: resultSearch.columns[0] });
                    }
                }
                else {
                    log.error("L54 - Calculo Retenciones", "obtenerCuentaIIBB - No se encuentro informacion de Configuración General IIBB");
                    log.debug("L54 - Calculo Retenciones", "RETURN NULL");
                    log.audit("L54 - Calculo Retenciones", "FIN - obtenerCuentaIIBB");
                    return null;
                }

                log.debug("L54 - Calculo Retenciones", "obtenerCuentaIIBB - idConfGeneral:" + idConfGeneral);

                if (!isEmpty(idConfGeneral) && idConfGeneral > 0) {
                    //SAVE SEARCH A EJECUTAR
                    var saveSearch = search.load({
                        id: "customsearch_l54_iibb_config_detalle"
                    });
                    //FILTRO ID CONFIG GENERAL
                    if (!isEmpty(idConfGeneral)) {
                        var filtroConfGeneral = search.createFilter({
                            name: "custrecord_l54_pv_det_link_padre",
                            operator: search.Operator.IS,
                            values: idConfGeneral
                        });
                        saveSearch.filters.push(filtroConfGeneral);
                    }
                    //FILTRO JURISDICCION
                    if (!isEmpty(jurisdiccionIIBB)) {
                        var filtroJurisdiccion = search.createFilter({
                            name: "custrecord_l54_pv_det_jurisdiccion",
                            operator: search.Operator.IS,
                            values: jurisdiccionIIBB
                        });
                        saveSearch.filters.push(filtroJurisdiccion);
                    }

                    var resultSearch = saveSearch.run();
                    var completeResultSet = [];
                    var resultIndex = 0;
                    var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                    var resultado; // temporary variable used to store the result set

                    do {
                        // fetch one result set
                        resultado = resultSearch.getRange({
                            start: resultIndex,
                            end: resultIndex + resultStep
                        });

                        if (!isEmpty(resultado) && resultado.length > 0) {
                            if (resultIndex == 0)
                                completeResultSet = resultado;
                            else
                                completeResultSet = completeResultSet.concat(resultado);
                        }
                        //increase pointer
                        resultIndex = resultIndex + resultStep;

                        // once no records are returned we already got all of them
                    } while (!isEmpty(resultado) && resultado.length > 0);

                    if (!isEmpty(completeResultSet)) {
                        if (completeResultSet.length > 0) {
                            idCuenta = completeResultSet[0].getValue({ name: resultSearch.columns[3] });
                        }
                    }
                    else {
                        log.error("L54 - Calculo Retenciones", "o - No se encuentro informacion de IIBB Configuración Detalle");
                        log.debug("L54 - Calculo Retenciones", "RETURN - idCuenta:" + idCuenta);
                        log.audit("L54 - Calculo Retenciones", "FIN - obtenerCuentaIIBB");
                        return idCuenta;
                    }
                }
            }
            log.debug("L54 - Calculo Retenciones", "RETURN - idCuenta:" + idCuenta);
            log.audit("L54 - Calculo Retenciones", "FIN - obtenerCuentaIIBB");
            return idCuenta;
        }


        function loadRetenciones(idVendorPayment) {
            log.audit("L54 - Calculo Retenciones", "INICIO - loadRetenciones");
            log.debug("L54 - Calculo Retenciones", "Parámetros - idVendorPayment: " + idVendorPayment);

            var arrayRetenciones = new Array();

            //DECLARACION DEL SAVE SEARCH A EJECUTAR
            var saveSearch = search.load({
                id: "customsearch_l54_retenciones_cal_ret"
            });

            //FILTRO PAGO DE PROVEEDOR
            if (!isEmpty(idVendorPayment)) {
                //FILTRO DE SUBSIDIARIA
                var filtroVendorPayment = search.createFilter({
                    name: "custrecord_l54_ret_ref_pago_prov",
                    operator: search.Operator.IS,
                    values: idVendorPayment
                });
                saveSearch.filters.push(filtroVendorPayment);

                var resultSearch = saveSearch.run();
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set
                var rangoInicial = 0;
                var completeResultSet = [];

                do {
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (rangoInicial == 0) completeResultSet = resultado;
                        else completeResultSet = completeResultSet.concat(resultado);
                    }
                    resultIndex = resultIndex + resultStep;
                } while (!isEmpty(resultado) && resultado.length > 0);
                rangoInicial = rangoInicial + resultStep;

                for (var i = 0; !isEmpty(completeResultSet) && i < completeResultSet.length; i++) {
                    var objRetenciones = new Object();
                    objRetenciones.ret_id_retencion = completeResultSet[i].getValue({ name: resultSearch.columns[0] });
                    objRetenciones.ret_retencion = completeResultSet[i].getValue({ name: resultSearch.columns[1] });
                    objRetenciones.ret_jurisdiccion = completeResultSet[i].getValue({ name: resultSearch.columns[2] });
                    objRetenciones.ret_importe = completeResultSet[i].getValue({ name: resultSearch.columns[3] });
                    objRetenciones.ret_tipo = completeResultSet[i].getValue({ name: resultSearch.columns[4] });
                    objRetenciones.ret_base_calculo = completeResultSet[i].getValue({ name: resultSearch.columns[5] });
                    objRetenciones.ret_base_calculo_imp = completeResultSet[i].getValue({ name: resultSearch.columns[6] });
                    objRetenciones.ret_neto_bill_aplicado = completeResultSet[i].getValue({ name: resultSearch.columns[7] });
                    objRetenciones.ret_condicion = completeResultSet[i].getValue({ name: resultSearch.columns[8] });
                    objRetenciones.ret_tipo_contrib_iibb = completeResultSet[i].getValue({ name: resultSearch.columns[9] });
                    objRetenciones.ret_alicuota = completeResultSet[i].getValue({ name: resultSearch.columns[10] });
                    objRetenciones.ret_tipo_exencion = completeResultSet[i].getValue({ name: resultSearch.columns[11] });
                    objRetenciones.ret_cert_exencion = completeResultSet[i].getValue({ name: resultSearch.columns[12] });
                    objRetenciones.ret_fecha_exencion = completeResultSet[i].getValue({ name: resultSearch.columns[13] });
                    arrayRetenciones.push(objRetenciones);
                }
                log.debug("L54 - Calculo Retenciones", "RETURN - arrayRetenciones: " + JSON.stringify(arrayRetenciones));
                log.audit("L54 - Calculo Retenciones", "FIN - loadRetenciones");
                return arrayRetenciones;
            }
            log.debug("L54 - Calculo Retenciones", "RETURN - arrayRetenciones: " + JSON.stringify(arrayRetenciones));
            log.audit("L54 - Calculo Retenciones", "FIN - loadRetenciones");
            return arrayRetenciones;
        }


        function zeroFill(number, width) {
            log.audit("L54 - Calculo Retenciones", "INICIO - zeroFill");
            log.debug("L54 - Calculo Retenciones", "Parámetros - number: " + number + "width: " + width);
            width -= number.toString().length;
            if (width > 0) {

                return new Array(width + (/\./.test(number) ? 2 : 1)).join("0") + number;
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - number: " + number);
            log.audit("L54 - Calculo Retenciones", "FIN - loadRetenciones");
            return number;
        }

        Number.prototype.toFixedOK = function (decimals) {
            var sign = this >= 0 ? 1 : -1;
            return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
        };

        function redondeo2decimales(numero) {
            log.audit("L54 - Calculo Retenciones", "INICIO - redondeo2decimales");
            log.debug("L54 - Calculo Retenciones", "Parámetros - numero: " + numero);

            var result = parseFloat(Math.round(parseFloat(numero) * 100) / 100).toFixed(2);

            log.debug("L54 - Calculo Retenciones", "RETURN - result: " + result);
            log.audit("L54 - Calculo Retenciones", "FIN - redondeo2decimales");
            return result;
        }

        function searchSavedPro(idSavedSearch, arrayParams) {
            var objRespuesta = new Object();
            objRespuesta.error = false;
            try {
                var savedSearch = search.load({
                    id: idSavedSearch
                });

                if (!isEmpty(arrayParams) && arrayParams.length > 0) {

                    for (var i = 0; i < arrayParams.length; i++) {
                        var nombre = arrayParams[i].name;
                        arrayParams[i].operator = operadorBusqueda(arrayParams[i].operator);
                        var join = arrayParams[i].join;
                        if (isEmpty(join)) {
                            join = null;
                        }
                        var value = arrayParams[i].values;
                        if (!Array.isArray(value)) {
                            value = [value];
                        }
                        var filtroID = "";
                        if (!isEmpty(join)) {
                            filtroID = search.createFilter({
                                name: nombre,
                                operator: arrayParams[i].operator,
                                join: join,
                                values: value
                            });
                        } else {
                            filtroID = search.createFilter({
                                name: nombre,
                                operator: arrayParams[i].operator,
                                values: value
                            });
                        }
                        savedSearch.filters.push(filtroID);
                    }
                }
                var resultSearch = savedSearch.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });
                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0) completeResultSet = resultado;
                        else completeResultSet = completeResultSet.concat(resultado);
                    }
                    // increase pointer
                    resultIndex = resultIndex + resultStep;
                    // once no records are returned we already got all of them
                } while (!isEmpty(resultado) && resultado.length > 0);
                objRsponseFunction = new Object();
                objRsponseFunction.result = completeResultSet;
                objRsponseFunction.search = resultSearch;
                var r = armarArreglosSS(completeResultSet, resultSearch);
                objRsponseFunction.array = r.array;
                objRespuesta.objRsponseFunction = objRsponseFunction;
            } catch (e) {
                objRespuesta.error = true;
                objRespuesta.tipoError = "RORV007";
                objRespuesta.descripcion = "function searchSavedPro: " + e.message;
                log.error("RORV007", "function searchSavedPro: " + e.message);
            }
            return objRespuesta;
        }

        function armarArreglosSS(resultSet, resultSearch) {
            var array = [];
            var respuesta = new Object({});
            respuesta.error = false;
            respuesta.msj = "";
            //log.debug("armarArreglosSS", "resultSet: " + JSON.stringify(resultSet));
            //log.debug("armarArreglosSS", "resultSearch: " + JSON.stringify(resultSearch));
            try {

                for (var i = 0; i < resultSet.length; i++) {
                    var obj = new Object({});
                    obj.indice = i;
                    for (var j = 0; j < resultSearch.columns.length; j++) {
                        var nombreColumna = resultSearch.columns[j].name;
                        //log.debug("armarArreglosSS","nombreColumna inicial: "+ nombreColumna);
                        if (nombreColumna.indexOf("formula") !== -1 || !isEmpty(resultSearch.columns[j].join)) {
                            nombreColumna = resultSearch.columns[j].label;

                            //if (nombreColumna.indexOf("Formula"))
                        }
                        //log.debug("armarArreglosSS","nombreColumna final: "+ nombreColumna);
                        if (Array.isArray(resultSet[i].getValue({ name: resultSearch.columns[j] }))) {
                            //log.debug("armarArreglosSS", "resultSet[i].getValue({ name: nombreColumna }): " + JSON.stringify(resultSet[i].getValue({ name: nombreColumna })));
                            var a = resultSet[i].getValue({ name: resultSearch.columns[j] });
                            //log.debug("armarArreglosSS", "a: " + JSON.stringify(a));
                            obj[nombreColumna] = a[0].value;
                        } else {
                            //log.debug("armarArreglosSS", "resultSet[i].getValue({ name: nombreColumna }): " + JSON.stringify(resultSet[i].getValue({ name: nombreColumna })));
                            obj[nombreColumna] = resultSet[i].getValue({ name: resultSearch.columns[j] });
                        }

                        /*else {
    
                            if (Array.isArray(resultSet[i].getValue({ name: nombreColumna }))) {
                                //log.debug("armarArreglosSS", "resultSet[i].getValue({ name: nombreColumna }): " + JSON.stringify(resultSet[i].getValue({ name: nombreColumna })));
                                var a = resultSet[i].getValue({ name: nombreColumna });
                                //log.debug("armarArreglosSS", "a: " + JSON.stringify(a));
                                obj[nombreColumna] = a[0].value;
                            } else {
                                //log.debug("armarArreglosSS", "resultSet[i].getValue({ name: nombreColumna }): " + JSON.stringify(resultSet[i].getValue({ name: nombreColumna })));
                                obj[nombreColumna] = resultSet[i].getValue({ name: nombreColumna });
                            }
                        }*/
                    }
                    //log.debug("armarArreglosSS", "obj: " + JSON.stringify(obj));
                    array.push(obj);
                }
                //log.debug("armarArreglosSS", "arrayArmado cantidad: " + array.length);
                respuesta.array = array;

            } catch (e) {
                respuesta.error = true;
                respuesta.tipoError = "RARR001";
                respuesta.msj = "Excepción: " + e;
                log.error("RARR001", "armarArreglosSS Excepción: " + e);
            }

            return respuesta;
        }

        function operadorBusqueda(operadorString) {
            var operator = "";
            switch (operadorString) {

                case "IS":
                    operator = search.Operator.IS;
                    break;

                case "AFTER":
                    operator = search.Operator.AFTER;
                    break;

                case "ALLOF":
                    operator = search.Operator.ALLOF;
                    break;

                case "ANY":
                    operator = search.Operator.ANY;
                    break;
                case "ANYOF":
                    operator = search.Operator.ANYOF;
                    break;

                case "BEFORE":
                    operator = search.Operator.BEFORE;
                    break;

                case "BETWEEN":
                    operator = search.Operator.BETWEEN;
                    break;

                case "CONTAINS":
                    operator = search.Operator.CONTAINS;
                    break;

                case "DOESNOTCONTAIN":
                    operator = search.Operator.DOESNOTCONTAIN;
                    break;

                case "DOESNOTSTARTWITH":
                    operator = search.Operator.DOESNOTSTARTWITH;
                    break;

                case "EQUALTO":
                    operator = search.Operator.EQUALTO;
                    break;

                case "GREATERTHAN":
                    operator = search.Operator.GREATERTHAN;
                    break;

                case "GREATERTHANOREQUALTO":
                    operator = search.Operator.GREATERTHANOREQUALTO;
                    break;

                case "HASKEYWORDS":
                    operator = search.Operator.HASKEYWORDS;
                    break;

                case "ISEMPTY":
                    operator = search.Operator.ISEMPTY;
                    break;

                case "ISNOT":
                    operator = search.Operator.ISNOT;
                    break;

                case "ISNOTEMPTY":
                    operator = search.Operator.ISNOTEMPTY;
                    break;

                case "LESSTHAN":
                    operator = search.Operator.LESSTHAN;
                    break;

                case "LESSTHANOREQUALTO":
                    operator = search.Operator.LESSTHANOREQUALTO;
                    break;

                case "NONEOF":
                    operator = search.Operator.NONEOF;
                    break;

                case "NOTAFTER":
                    operator = search.Operator.NOTAFTER;
                    break;

                case "NOTALLOF":
                    operator = search.Operator.NOTALLOF;
                    break;

                case "NOTBEFORE":
                    operator = search.Operator.NOTBEFORE;
                    break;

                case "NOTBETWEEN":
                    operator = search.Operator.NOTBETWEEN;
                    break;

                case "NOTEQUALTO":
                    operator = search.Operator.NOTEQUALTO;
                    break;

                case "NOTGREATERTHAN":
                    operator = search.Operator.NOTGREATERTHAN;
                    break;

                case "NOTGREATERTHANOREQUALTO":
                    operator = search.Operator.NOTGREATERTHANOREQUALTO;
                    break;

                case "NOTLESSTHAN":
                    operator = search.Operator.NOTLESSTHAN;
                    break;

                case "NOTLESSTHANOREQUALTO":
                    operator = search.Operator.NOTLESSTHANOREQUALTO;
                    break;

                case "NOTON":
                    operator = search.Operator.NOTON;
                    break;

                case "NOTONORAFTER":
                    operator = search.Operator.NOTONORAFTER;
                    break;

                case "NOTONORBEFORE":
                    operator = search.Operator.NOTONORBEFORE;
                    break;

                case "NOTWITHIN":
                    operator = search.Operator.NOTWITHIN;
                    break;

                case "ON":
                    operator = search.Operator.ON;
                    break;

                case "ONORAFTER":
                    operator = search.Operator.ONORAFTER;
                    break;

                case "ONORBEFORE":
                    operator = search.Operator.ONORBEFORE;
                    break;

                case "STARTSWITH":
                    operator = search.Operator.STARTSWITH;
                    break;

                case "WITHIN":
                    operator = search.Operator.WITHIN;
                    break;
            }
            return operator;
        }

        //JSALAZAR: FUNCION QUE OBTIENE LOS IMPORTES NETOS DE LAS BILLS QUE ESTÁN CON L54 - JURISDICCIÓN ÚNICA NO VACÍO
        function obtener_arreglo_netos_vendorbill_jurisdiccion(entidad, billsPagar, subsidiaria, esONG) {

            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_arreglo_netos_vendorbill_jurisdiccion");
            log.debug("L54 - Calculo Retenciones", "Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria + " - esONG: " + esONG);

            var informacionNetosJurisdiccion = new Array();

            //SAVE SEARCH A EJECUTAR
            // Si es ONG se invoca al SS que sólo toma en cuenta las líneas con ID IMPUESTO AFIP == 2
            if (!isEmpty(esONG) && (esONG == "T" || esONG)) {
                var searchNetosVB = search.load({
                    id: "customsearch_l54_bill_net_amt_jur_em_ong"
                });
            } else { // Si no es ONG se invoca al SS que no toma en cuenta las líneas con ID IMPUESTO AFIP == 3
                var searchNetosVB = search.load({
                    id: "customsearch_l54_bill_net_amt_jurisd"
                });
            }

            //FILTRO PROVEEDOR
            if (!isEmpty(entidad)) {
                var filtroEntidad = search.createFilter({
                    name: "entity",
                    operator: search.Operator.IS,
                    values: entidad
                });
                searchNetosVB.filters.push(filtroEntidad);
            }

            //FILTRO BILLS A PAGAR
            if (!isEmpty(billsPagar)) {
                var filtroBillsPagar = search.createFilter({
                    name: "internalid",
                    operator: search.Operator.ANYOF,
                    values: billsPagar
                });
                searchNetosVB.filters.push(filtroBillsPagar);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchNetosVB.filters.push(filtroSubsidiaria);
            }

            var resultSearch = searchNetosVB.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);


            if (!isEmpty(completeResultSet)) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    informacionNetosJurisdiccion[i] = new Object();

                    informacionNetosJurisdiccion[i].idTransaccion = completeResultSet[i].getValue({
                        name: resultSearch.columns[1]
                    });//ID INTERNO BILL

                    informacionNetosJurisdiccion[i].importe = parseFloat(completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    }), 10);//IMPORTE NETO

                    informacionNetosJurisdiccion[i].jurisdiccion = completeResultSet[i].getValue({
                        name: resultSearch.columns[3]
                    });//JURISDICCION

                    informacionNetosJurisdiccion[i].referenceNumber = completeResultSet[i].getValue({
                        name: resultSearch.columns[4]
                    });//JURISDICCION
                }
            }
            else {
                log.debug("L54 - Calculo Retenciones", "obtener_arreglo_netos_vendorbill_jurisdiccion - No se encuentro informacion para las bills recibidas por parametro");
            }
            log.debug("L54 - Calculo Retenciones", "RETURN - informacionNetosJurisdiccion: " + JSON.stringify(informacionNetosJurisdiccion));
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_arreglo_netos_vendorbill_jurisdiccion");
            return informacionNetosJurisdiccion;
        }

        //JSALAZAR: FUNCION QUE OBTIENE LOS IMPORTES NETOS DE LAS BILLS CON JURISDICCIÓN DE ENTREGA - DEVUELVE UN ARRAY
        function obtener_arreglo_netos_vendorbill_jurisdiccion_entrega(entidad, billsPagar, subsidiaria, esONG) {

            try {

                log.audit("L54 - Calculo Retenciones", "INICIO - obtener_arreglo_netos_vendorbill_jurisdiccion_entrega");
                log.debug("L54 - Calculo Retenciones", "Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria + " - esONG: " + esONG);

                var informacionNetosJurisdiccionEntrega = new Array();

                //SAVE SEARCH A EJECUTAR
                var searchNetosVBJurEntrega = search.load({
                    id: "customsearch_l54_bill_net_amt_jurisd"
                });

                //FILTRO PROVEEDOR
                if (!isEmpty(entidad)) {
                    var filtroEntidad = search.createFilter({
                        name: "entity",
                        operator: search.Operator.IS,
                        values: entidad
                    });
                    searchNetosVBJurEntrega.filters.push(filtroEntidad);
                }

                //FILTRO BILLS A PAGAR
                if (!isEmpty(billsPagar)) {
                    var filtroBillsPagar = search.createFilter({
                        name: "internalid",
                        operator: search.Operator.ANYOF,
                        values: billsPagar
                    });
                    searchNetosVBJurEntrega.filters.push(filtroBillsPagar);
                }

                //FILTRO SUBSIDIARIA
                if (!isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = search.createFilter({
                        name: "subsidiary",
                        operator: search.Operator.IS,
                        values: subsidiaria
                    });
                    searchNetosVBJurEntrega.filters.push(filtroSubsidiaria);
                }

                var resultSearch = searchNetosVBJurEntrega.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!isEmpty(resultado) && resultado.length > 0);


                if (!isEmpty(completeResultSet)) {
                    for (var i = 0; i < completeResultSet.length; i++) {
                        informacionNetosJurisdiccionEntrega[i] = new Object();

                        informacionNetosJurisdiccionEntrega[i].idTransaccion = completeResultSet[i].getValue({
                            name: resultSearch.columns[0]
                        });//ID INTERNO BILL

                        informacionNetosJurisdiccionEntrega[i].nombre = parseFloat(completeResultSet[i].getValue({
                            name: resultSearch.columns[1]
                        }), 10);

                        informacionNetosJurisdiccionEntrega[i].importeNeto = completeResultSet[i].getValue({
                            name: resultSearch.columns[2]
                        });//IMPORTE NETO

                        informacionNetosJurisdiccionEntrega[3].jurisdiccion = completeResultSet[i].getValue({
                            name: resultSearch.columns[4]
                        });//JURISDICCION
                    }
                }
                else {
                    log.debug("L54 - Calculo Retenciones", "obtener_arreglo_netos_vendorbill_jurisdiccion_entrega - No se encuentro informacion para las bills recibidas por parametro");
                }

                log.debug("L54 - Calculo Retenciones", "RETURN - informacionNetosJurisdiccionEntrega: " + JSON.stringify(informacionNetosJurisdiccionEntrega));
                log.audit("L54 - Calculo Retenciones", "FIN - obtener_arreglo_netos_vendorbill_jurisdiccion_entrega");
                return informacionNetosJurisdiccionEntrega;

            } catch (e) {
                log.error("L54 - Calculo Retenciones", "obtener_arreglo_netos_vendorbill_jurisdiccion_entrega - Error Excepción - Netsuite Error: " + e.message);
                return null;
            }
        }

        //ABRITO: FUNCION QUE OBTIENE LOS CODIGOS DE RETENCION QUE APLICAN LAS BILLS RECIBIDAS POR PARAMETRO - DEVUELVE UN ARRAY
        function obtener_arreglo_codigos_ret_vendorbill_emp_ong(entidad, billsPagar, subsidiaria) {
            log.audit("L54 - Calculo Retenciones", "INICIO - obtener_arreglo_codigos_ret_vendorbill");
            log.debug("L54 - Calculo Retenciones", "Parámetros - entidad: " + entidad + " - billsPagar: " + billsPagar + " - subsidiaria: " + subsidiaria);

            var informacionCodigosVB = [];

            //SAVE SEARCH A EJECUTAR
            var searchCodRet = search.load({
                id: "customsearch_l54_bill_cod_ret"
            });

            //FILTRO PROVEEDOR
            if (!isEmpty(entidad)) {
                var filtroEntidad = search.createFilter({
                    name: "entity",
                    operator: search.Operator.IS,
                    values: entidad
                });
                searchCodRet.filters.push(filtroEntidad);
            }

            //FILTRO BILLS A PAGAR
            if (!isEmpty(billsPagar)) {
                var filtroBillsPagar = search.createFilter({
                    name: "internalid",
                    operator: search.Operator.ANYOF,
                    values: billsPagar
                });
                searchCodRet.filters.push(filtroBillsPagar);
            }

            //FILTRO SUBSIDIARIA
            if (!isEmpty(subsidiaria)) {
                var filtroSubsidiaria = search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchCodRet.filters.push(filtroSubsidiaria);
            }

            var resultSearch = searchCodRet.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set

            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });

                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
                //increase pointer
                resultIndex = resultIndex + resultStep;

                // once no records are returned we already got all of them
            } while (!isEmpty(resultado) && resultado.length > 0);


            if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                for (var i = 0; i < completeResultSet.length; i++) {
                    informacionCodigosVB[i] = new Object();

                    informacionCodigosVB[i].idInterno = completeResultSet[i].getValue({
                        name: resultSearch.columns[1]
                    });//ID INTERNO

                    informacionCodigosVB[i].importeTotal = parseFloat(completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    }), 10);//IMPORTE TOTAL

                    informacionCodigosVB[i].codigoRetGanancias = completeResultSet[i].getValue({
                        name: resultSearch.columns[3]
                    });//CODIGO RETENCION GANANCIAS

                    informacionCodigosVB[i].codigoRetIVA = completeResultSet[i].getValue({
                        name: resultSearch.columns[4]
                    });//CODIGO RETENCION IVA

                    informacionCodigosVB[i].codigoRetSUSS = completeResultSet[i].getValue({
                        name: resultSearch.columns[5]
                    });//CODIGO RETENCION SUSS

                    informacionCodigosVB[i].esFacturaM = completeResultSet[i].getValue({
                        name: resultSearch.columns[6]
                    });//INDICA SI ES UNA TRANSACCION M

                    informacionCodigosVB[i].calcularSobreIVA = completeResultSet[i].getValue({
                        name: resultSearch.columns[8]
                    });//INDICA SI LA BASE DE CÁLCULO SE CALCULA SOBRE IVA
                }
            }
            else {
                log.error("L54 - Calculo Retenciones", "obtener_arreglo_codigos_ret_vendorbill - No se encuentro informacion para las bills recibidas por parametro");
                return null;
            }

            log.debug("L54 - Calculo Retenciones", "RETURN - informacionCodigosVB: " + JSON.stringify(informacionCodigosVB));
            log.audit("L54 - Calculo Retenciones", "FIN - obtener_arreglo_codigos_ret_vendorbill");
            return informacionCodigosVB;
        }

        // JSALAZAR: Función que permite obtener la información de la jurisdicción de entrega de las facturas que se están pagando.
        function obtener_info_facturas_jurisdiccion_entrega(resultsNetosVBForRetIIBB, id_vendorbill, importe_neto_factura_proveedor_a_pagar_ret_iibb) {

            try {
                log.debug("obtener_info_facturas_jurisdiccion_entrega", "INICIO - obtener_info_facturas_jurisdiccion_entrega");
                log.debug("obtener_info_facturas_jurisdiccion_entrega", "Parámetros - resultsNetosVBForRetIIBB: " + JSON.stringify(resultsNetosVBForRetIIBB) + ", idVendorBill: " + id_vendorbill + " importe_neto_factura_proveedor_a_pagar_ret_iibb: " + importe_neto_factura_proveedor_a_pagar_ret_iibb);

                var objInfofactura = {};
                objInfofactura.tieneJurisdiccionEntrega = false;

                var resultVendorBillJurisdiccionEntrega = resultsNetosVBForRetIIBB.filter(function (obj) {
                    return (obj.idInterno == id_vendorbill);
                });

                if (!isEmpty(resultVendorBillJurisdiccionEntrega) && resultVendorBillJurisdiccionEntrega.length > 0 && !isEmpty(resultVendorBillJurisdiccionEntrega[0].jurisdiccionEntregaCodigo) && !isEmpty(resultVendorBillJurisdiccionEntrega[0].jurisdiccionEntregaID)) {
                    objInfofactura.jurisdiccionEntregaID = resultVendorBillJurisdiccionEntrega[0].jurisdiccionEntregaID;
                    objInfofactura.jurisdiccionEntregaCodigo = resultVendorBillJurisdiccionEntrega[0].jurisdiccionEntregaCodigo;
                    objInfofactura.jurisdiccionEntregaNombre = resultVendorBillJurisdiccionEntrega[0].jurisdiccionEntregaNombre;
                    objInfofactura.impNetoFactJurisdiccionEntrega = parseFloat(importe_neto_factura_proveedor_a_pagar_ret_iibb, 10);
                    objInfofactura.tieneJurisdiccionEntrega = true;
                } else {
                    log.debug("obtener_info_facturas_jurisdiccion_entrega", "obtener_info_facturas_jurisdiccion_entrega - No hay jurisdicción de entrega para la vendor bill: " + id_vendorbill + ", recibida por parámetros.");
                }

                log.debug("obtener_info_facturas_jurisdiccion_entrega", "RETURN - objInfofactura: " + JSON.stringify(objInfofactura));
                log.audit("obtener_info_facturas_jurisdiccion_entrega", "FIN - obtener_info_facturas_jurisdiccion_entrega");
                return objInfofactura;

            } catch (e) {
                log.error("obtener_info_facturas_jurisdiccion_entrega", "obtener_info_facturas_jurisdiccion_entrega - Error Excepción - Netsuite Error: " + e.message);
                return null;
            }
        }

        // JSALAZAR: Función que permite unificar los importes de las facturas que se están pagando y tienen la jurisdicción de entrega definida
        function unificar_importes_facturas_jurisdiccion_entrega(arrayFacturasJurisdiccionEntrega) {

            try {
                log.debug("unificar_importes_facturas_jurisdiccion_entrega", "INICIO - unificar_importes_facturas_jurisdiccion_entrega");
                log.debug("unificar_importes_facturas_jurisdiccion_entrega", "Parámetros - arrayFacturasJurisdiccionEntrega: " + JSON.stringify(arrayFacturasJurisdiccionEntrega));

                var arrayImportesFacturaUnificados = [];
                for (var i = 0; i < arrayFacturasJurisdiccionEntrega.length; i++) {
                    for (var j = 0; j < arrayImportesFacturaUnificados.length; j++) {
                        if (arrayFacturasJurisdiccionEntrega[i].jurisdiccionEntregaCodigo == arrayImportesFacturaUnificados[j].jurisdiccionEntregaCodigo) {
                            arrayImportesFacturaUnificados[j].impNetoFactJurisdiccionEntrega += parseFloat(arrayFacturasJurisdiccionEntrega[i].impNetoFactJurisdiccionEntrega, 10);
                            break;
                        }
                    }

                    if (j == arrayImportesFacturaUnificados.length) {
                        arrayImportesFacturaUnificados.push(arrayFacturasJurisdiccionEntrega[i]);
                    }
                }

                // Limpio los importes con más de 10 decimales.
                for (var i = 0; i < arrayImportesFacturaUnificados.length; i++) {
                    if (parseFloat(countDecimales(parseFloat(arrayImportesFacturaUnificados[i].impNetoFactJurisdiccionEntrega, 10)), 10) > 13) {
                        arrayImportesFacturaUnificados[i].impNetoFactJurisdiccionEntrega = parseFloat(arrayImportesFacturaUnificados[i].impNetoFactJurisdiccionEntrega, 10).toFixedOK(2);
                    }
                }

                log.debug("unificar_importes_facturas_jurisdiccion_entrega", "RETURN - arrayImportesFacturaUnificados: " + JSON.stringify(arrayImportesFacturaUnificados));
                log.audit("unificar_importes_facturas_jurisdiccion_entrega", "FIN - unificar_importes_facturas_jurisdiccion_entrega");
                return arrayImportesFacturaUnificados;

            } catch (e) {
                log.error("unificar_importes_facturas_jurisdiccion_entrega", "unificar_importes_facturas_jurisdiccion_entrega - Error Excepción - Netsuite Error: " + e.message);
                return null;
            }
        }

        function jurisdiccionesEntregaValidas(arrayJurisdiccionesEntregaUnificado, arrayConfigDetalle, jurisdiccionesProveedor) {

            try {
                log.debug("jurisdiccionesEntregaValidas", "INICIO - jurisdiccionesEntregaValidas");
                log.debug("jurisdiccionesEntregaValidas", "Parámetros - arrayJurisdiccionesEntregaUnificado: " + JSON.stringify(arrayJurisdiccionesEntregaUnificado) + " - arrayConfigDetalle: " + JSON.stringify(arrayConfigDetalle) + " - jurisdiccionesProveedor: " + JSON.stringify(jurisdiccionesProveedor));
                var infoArrayJurisdiccionesEntregaValidas = {};
                infoArrayJurisdiccionesEntregaValidas.infoJurisdicciones = [];
                var jurisdiccionesNoValidas = "";
                infoArrayJurisdiccionesEntregaValidas.jurisdiccionesErroneas = false;
                infoArrayJurisdiccionesEntregaValidas.mensajeError = "";
                var infoJurisdEntregaProveedor = [];

                if (!isEmpty(arrayJurisdiccionesEntregaUnificado) && arrayJurisdiccionesEntregaUnificado.length > 0 && !isEmpty(arrayConfigDetalle) && arrayConfigDetalle.length > 0 && !isEmpty(jurisdiccionesProveedor) && jurisdiccionesProveedor.length > 0) {
                    /* for (var i = 0; i < arrayJurisdiccionesEntregaUnificado.length; i++) {
                        var resultFilter = jurisdiccionesProveedor.filter(function (obj) {
                            return (obj.jurisdiccion == arrayJurisdiccionesEntregaUnificado[i].jurisdiccionEntregaID);
                        });

                        if (!isEmpty(resultFilter) && resultFilter.length > 0) {
                            infoJurisdEntregaProveedor.push(arrayJurisdiccionesEntregaUnificado[i]);
                        } else {
                            infoArrayJurisdiccionesEntregaValidas.jurisdiccionesErroneas = true;
                            
                            if (isEmpty(jurisdiccionesNoValidas))
                                jurisdiccionesNoValidas = arrayJurisdiccionesEntregaUnificado[i].jurisdiccionEntregaNombre;
                            else
                                jurisdiccionesNoValidas += ", " + arrayJurisdiccionesEntregaUnificado[i].jurisdiccionEntregaNombre;
                        }
                    }

                    log.debug("DEBUG", "LINE 8346 - infoJurisdEntregaProveedor: " + JSON.stringify(infoJurisdEntregaProveedor)); */

                    for (var i = 0; i < arrayJurisdiccionesEntregaUnificado.length; i++) {
                        var resultFilter = arrayConfigDetalle.filter(function (obj) {
                            return (obj.jurisdiccionConfigDetalle == arrayJurisdiccionesEntregaUnificado[i].jurisdiccionEntregaID);
                        });

                        if (!isEmpty(resultFilter) && resultFilter.length > 0) {
                            infoArrayJurisdiccionesEntregaValidas.infoJurisdicciones.push(arrayJurisdiccionesEntregaUnificado[i]);
                        } else {
                            infoArrayJurisdiccionesEntregaValidas.jurisdiccionesErroneas = true;

                            if (isEmpty(jurisdiccionesNoValidas))
                                jurisdiccionesNoValidas = arrayJurisdiccionesEntregaUnificado[i].jurisdiccionEntregaNombre;
                            else
                                jurisdiccionesNoValidas += ", " + arrayJurisdiccionesEntregaUnificado[i].jurisdiccionEntregaNombre;
                        }
                    }
                }

                if (infoArrayJurisdiccionesEntregaValidas.jurisdiccionesErroneas && !isEmpty(jurisdiccionesNoValidas))
                    infoArrayJurisdiccionesEntregaValidas.mensajeError = "Las Jurisdicciones: " + jurisdiccionesNoValidas + "; definidas como jurisdicciones de entrega en algunas facturas, no se encuentran correctamente configuradas en el proveedor o en el RT IIBB Configuración Detalle y no generarán retenciones";

                log.debug("jurisdiccionesEntregaValidas", "RETURN - infoArrayJurisdiccionesEntregaValidas: " + JSON.stringify(infoArrayJurisdiccionesEntregaValidas));
                log.audit("jurisdiccionesEntregaValidas", "FIN - jurisdiccionesEntregaValidas");
                return infoArrayJurisdiccionesEntregaValidas;

            } catch (e) {
                log.error("jurisdiccionesEntregaValidas", "jurisdiccionesEntregaValidas - Error Excepción - Netsuite Error: " + e.message);
                return null;
            }
        }

        function obtenerCodigoRetencionPadronIIBB(arregloCodigosRetencionIIBB, idTipoPadron, id_proveedor, jurisdiccion, id_posting_period) {

            try {
                log.debug("obtenerCodigoRetencionPadronIIBB", "INICIO - obtenerCodigoRetencionPadronIIBB");
                log.debug("obtenerCodigoRetencionPadronIIBB", "Parámetros - arregloCodigosRetencionIIBB: " + JSON.stringify(arregloCodigosRetencionIIBB) + " - idTipoPadron: " + idTipoPadron + " - id_proveedor: " + id_proveedor + " - jurisdiccion: " + jurisdiccion);
                //var codigoRetencionIIBB = "";
                var codigoRetencionIIBB = {};
                codigoRetencionIIBB.codigo = "";
                codigoRetencionIIBB.alicuota = "";

                if ((arregloCodigosRetencionIIBB != null && arregloCodigosRetencionIIBB.length > 0 && !isEmpty(idTipoPadron) && !isEmpty(id_proveedor)) || (!isEmpty(jurisdiccion) && !isEmpty(id_proveedor))) {

                    if (arregloCodigosRetencionIIBB != null && arregloCodigosRetencionIIBB.length > 0 && !isEmpty(idTipoPadron) && !isEmpty(id_proveedor)) {
                        var resultadoCodigosRetencionPadronIIBB = arregloCodigosRetencionIIBB.filter(function (obj) {
                            return (obj.tipoPadron === idTipoPadron && obj.idProveedor === id_proveedor && obj.periodo === id_posting_period);
                        });
                    } else {
                        if (!isEmpty(jurisdiccion) && !isEmpty(id_proveedor)) {
                            var resultadoCodigosRetencionPadronIIBB = arregloCodigosRetencionIIBB.filter(function (obj) {
                                return (obj.jurisdiccion === jurisdiccion && obj.idProveedor === id_proveedor && obj.periodo === id_posting_period);
                            });
                        }
                    }

                    if (!isEmpty(resultadoCodigosRetencionPadronIIBB) && resultadoCodigosRetencionPadronIIBB.length > 0) {
                        var codigoRetencionPadron = resultadoCodigosRetencionPadronIIBB[0].codigo;
                        var alicuotaRetencionPadron = resultadoCodigosRetencionPadronIIBB[0].alicuota;
                        var estadoInscripcionPadron = resultadoCodigosRetencionPadronIIBB[0].estadoInscripcionPadron;
                        var excluyente = resultadoCodigosRetencionPadronIIBB[0].excluyente;
                        var coeficienteRetencion = resultadoCodigosRetencionPadronIIBB[0].coeficienteRetencion;
                        var alicuotaRetencionEspecial = resultadoCodigosRetencionPadronIIBB[0].alicuotaRetencionEspecial;
                        codigoRetencionIIBB.esPadron = true;

                        if (!isEmpty(codigoRetencionPadron))
                            codigoRetencionIIBB.codigo = codigoRetencionPadron;

                        if (!isEmpty(alicuotaRetencionPadron))
                            codigoRetencionIIBB.alicuota = alicuotaRetencionPadron;

                        if (!isEmpty(estadoInscripcionPadron))
                            codigoRetencionIIBB.estadoInscripcionPadron = estadoInscripcionPadron;

                        if (!isEmpty(excluyente))
                            codigoRetencionIIBB.excluyente = excluyente;

                        if (!isEmpty(coeficienteRetencion))
                            codigoRetencionIIBB.coeficienteRetencion = coeficienteRetencion;

                        if (!isEmpty(alicuotaRetencionEspecial))
                            codigoRetencionIIBB.alicuotaRetencionEspecial = alicuotaRetencionEspecial;
                    }
                }

                log.debug("obtenerCodigoRetencionPadronIIBB", "RETURN - codigoRetencionIIBB: " + JSON.stringify(codigoRetencionIIBB));
                log.debug("obtenerCodigoRetencionPadronIIBB", "FIN - obtenerCodigoRetencionPadronIIBB");
                return codigoRetencionIIBB;

            } catch (e) {
                log.error("obtenerCodigoRetencionPadronIIBB", "obtenerCodigoRetencionPadronIIBB - Error Excepción - Netsuite Error: " + e.message);
                return null;
            }
        }

        function obtenerConfiguracionDetalleIIBB(idConfGeneral) {

            try {
                log.debug("obtenerConfiguracionDetalleIIBB", "INICIO - obtenerConfiguracionDetalleIIBB");
                log.debug("obtenerConfiguracionDetalleIIBB", "Parámetros - arregloCodigosRetencionIIBB: " + idConfGeneral);

                var arrayConfigDetalle = [];

                //SAVE SEARCH A EJECUTAR
                var searchIIBBConfDetalle = search.load({
                    id: "customsearch_l54_iibb_config_detalle"
                });

                //FILTRO CONFIG GENERAL
                if (!isEmpty(idConfGeneral)) {
                    var filtroConfGeneral = search.createFilter({
                        name: "custrecord_l54_pv_det_link_padre",
                        operator: search.Operator.IS,
                        values: idConfGeneral
                    });
                    searchIIBBConfDetalle.filters.push(filtroConfGeneral);
                }

                var resultSearch = searchIIBBConfDetalle.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set

                do {
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }
                    //increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!isEmpty(resultado) && resultado.length > 0);

                // INICIO - Obtengo los resultados de la configuración detalle y los guardo en un array
                if (!isEmpty(completeResultSet) && completeResultSet.length > 0) {
                    for (var j = 0; j < completeResultSet.length; j++) {
                        var objInfoConfigDetalle = {};

                        objInfoConfigDetalle.padronUsar = completeResultSet[j].getValue({
                            name: resultSearch.columns[1]
                        });//TIPO PADRON A USAR

                        objInfoConfigDetalle.codRetGeneral = completeResultSet[j].getValue({
                            name: resultSearch.columns[2]
                        });//COD RETENCION GENERAL

                        objInfoConfigDetalle.cuentaRetencion = completeResultSet[j].getValue({
                            name: resultSearch.columns[3]
                        });//CUENTA RETENCION

                        objInfoConfigDetalle.alicuotaRetencion = completeResultSet[j].getValue({
                            name: resultSearch.columns[4]
                        });//ALICUOTA RETENCION

                        objInfoConfigDetalle.jurisdiccionConfigDetalle = completeResultSet[j].getValue({
                            name: resultSearch.columns[5]
                        });//JURISDICCIÓN RETENCIÓN

                        objInfoConfigDetalle.porcentaje_alicuota_utilizar = completeResultSet[j].getValue({
                            name: resultSearch.columns[6]
                        });//PORCENTAJE ALÍCUOTA UTILIZAR (SEDE TUCUMÁN)

                        objInfoConfigDetalle.alicuota_especial = completeResultSet[j].getValue({
                            name: resultSearch.columns[7]
                        });//ALÍCUOTA ESPECIAL

                        objInfoConfigDetalle.idConvenioLocal = completeResultSet[j].getValue({
                            name: resultSearch.columns[8]
                        });//CONVENIO LOCAL

                        objInfoConfigDetalle.idConvenioMultilateral = completeResultSet[j].getValue({
                            name: resultSearch.columns[9]
                        });//CONVENIO MULTILATERAL

                        objInfoConfigDetalle.idResponsableInscripto = completeResultSet[j].getValue({
                            name: resultSearch.columns[10]
                        });//CONDICIÓN FISCAL INSCRIPTO

                        objInfoConfigDetalle.idMonotrotributista = completeResultSet[j].getValue({
                            name: resultSearch.columns[11]
                        });//CONDICIÓN FISCAL MONOTRIBUTO

                        objInfoConfigDetalle.porcentajeEspecialCoeficienteCero = completeResultSet[j].getValue({
                            name: resultSearch.columns[12]
                        });//PORCENTAJE ESPECIAL COEFICIENTE CERO

                        objInfoConfigDetalle.porcentajeAlicUtilSedeNoTucuman = completeResultSet[j].getValue({
                            name: resultSearch.columns[13]
                        });//PORCENTAJE ALÍCUOTA UTILIZAR (SEDE NO TUCUMÁN)

                        /* objInfoConfigDetalle.tipoContribuyenteIIBB = completeResultSet[j].getValue({
                            name: resultSearch.columns[14]
                        });//TIPO CONTRIBUYENTE IIBB */

                        objInfoConfigDetalle.porcentajeEspecialUtilizarBI = completeResultSet[j].getValue({
                            name: resultSearch.columns[15]
                        });//PORCENTAJE ESPECIAL A UTILIZAR (BI)

                        objInfoConfigDetalle.tipoContribuyenteIIBB = completeResultSet[j].getValue({
                            name: resultSearch.columns[16]
                        });//TIPO CONTRIBUYENTE IIBB

                        objInfoConfigDetalle.jurisdiccionSede = convertToBoolean(completeResultSet[j].getValue({
                            name: resultSearch.columns[17]
                        }));//Jurisdiccion sede

                        objInfoConfigDetalle.tipoContribuyenteIVA = completeResultSet[j].getValue({
                            name: resultSearch.columns[18]
                        });//TIPO CONTRIBUYENTE IVA

                        objInfoConfigDetalle.baseCalcAcumulada = convertToBoolean(completeResultSet[j].getValue({
                            name: resultSearch.columns[19]
                        }));//Base calculo acumulada IIBB

                        objInfoConfigDetalle.calcularSobreNeto = convertToBoolean(completeResultSet[j].getValue({
                            name: resultSearch.columns[20]
                        }));//Calcular sobre el importe neto

                        objInfoConfigDetalle.calcularSobreBruto = convertToBoolean(completeResultSet[j].getValue({
                            name: resultSearch.columns[21]
                        }));//Calcular sobre el importe bruto

                        objInfoConfigDetalle.impMinBaseCalculoRet = completeResultSet[j].getValue({
                            name: resultSearch.columns[22]
                        });//Importe minimo para base de cálculo de retenciones

                        objInfoConfigDetalle.criterioPorcentajeEspecial = completeResultSet[j].getValue({
                            name: resultSearch.columns[23]
                        });//Importe minimo para base de cálculo de retenciones

                        arrayConfigDetalle.push(objInfoConfigDetalle);
                    }
                }

                log.debug("obtenerConfiguracionDetalleIIBB", "RETURN - arrayConfigDetalle: " + JSON.stringify(arrayConfigDetalle));
                log.debug("obtenerConfiguracionDetalleIIBB", "FIN - obtenerConfiguracionDetalleIIBB");
                return arrayConfigDetalle;

            } catch (e) {
                log.error("obtenerConfiguracionDetalleIIBB", "obtenerConfiguracionDetalleIIBB - Error Excepción - Netsuite Error: " + e.message);
                return null;
            }
        }

        function obtenerDatosJurisdiccionEntrega(infoRet, datosJurisdiccionEntrega) {

            try {

                log.debug("obtenerDatosJurisdiccionEntrega", "INICIO - obtenerDatosJurisdiccionEntrega");
                log.debug("obtenerDatosJurisdiccionEntrega", "Parámetros: infoRet: " + JSON.stringify(infoRet) + " - datosJurisdiccionEntrega: " + JSON.stringify(datosJurisdiccionEntrega));

                var objRespuestaDataJurisdiccionEntrega = {};
                objRespuestaDataJurisdiccionEntrega.error = false;

                if (!isEmpty(infoRet) && !isEmpty(datosJurisdiccionEntrega)) {
                    objRespuestaDataJurisdiccionEntrega.codigo = infoRet.codigo;
                    objRespuestaDataJurisdiccionEntrega.cuenta = infoRet.cuenta;
                    objRespuestaDataJurisdiccionEntrega.codigoJurisdiccionDireccionEntrega = datosJurisdiccionEntrega.jurisdiccionEntregaCodigo;
                    objRespuestaDataJurisdiccionEntrega.idJurisdiccionDireccionEntrega = datosJurisdiccionEntrega.jurisdiccionEntregaID;
                    objRespuestaDataJurisdiccionEntrega.importe_factura_pagar = datosJurisdiccionEntrega.impNetoFactJurisdiccionEntrega;
                    objRespuestaDataJurisdiccionEntrega.condicion = infoRet.condicion;
                    objRespuestaDataJurisdiccionEntrega.condicionID = infoRet.condicionID;
                    objRespuestaDataJurisdiccionEntrega.jurisdiccion = infoRet.jurisdiccion;
                    objRespuestaDataJurisdiccionEntrega.porcentajeRetencion = infoRet.porcentajeRetencion;
                    objRespuestaDataJurisdiccionEntrega.certExencion = infoRet.certExencion;
                    objRespuestaDataJurisdiccionEntrega.tipoExencion = infoRet.tipoExencion;
                    objRespuestaDataJurisdiccionEntrega.fcaducidadExencion = infoRet.fcaducidadExencion;
                    objRespuestaDataJurisdiccionEntrega.jurisdiccionCodigo = infoRet.jurisdiccionCodigo;
                    objRespuestaDataJurisdiccionEntrega.estadoInscripcionPadron = infoRet.estadoInscripcionPadron;
                    objRespuestaDataJurisdiccionEntrega.coeficienteRetencion = infoRet.coeficienteRetencion;
                    objRespuestaDataJurisdiccionEntrega.esPadron = infoRet.esPadron;
                    objRespuestaDataJurisdiccionEntrega.porcentaje_alicuota_utilizar = infoRet.porcentaje_alicuota_utilizar;
                    objRespuestaDataJurisdiccionEntrega.alicuota_especial = infoRet.alicuota_especial;
                    objRespuestaDataJurisdiccionEntrega.idConvenioLocal = infoRet.idConvenioLocal;
                    objRespuestaDataJurisdiccionEntrega.idConvenioMultilateral = infoRet.idConvenioMultilateral;
                    objRespuestaDataJurisdiccionEntrega.idResponsableInscripto = infoRet.idResponsableInscripto;
                    objRespuestaDataJurisdiccionEntrega.idMonotrotributista = infoRet.idMonotrotributista;
                    objRespuestaDataJurisdiccionEntrega.porcentajeEspecialCoeficienteCero = infoRet.porcentajeEspecialCoeficienteCero;
                    objRespuestaDataJurisdiccionEntrega.porcentajeAlicUtilSedeNoTucuman = infoRet.porcentajeAlicUtilSedeNoTucuman;
                    objRespuestaDataJurisdiccionEntrega.jurisdiccionTexto = infoRet.jurisdiccionTexto;
                } else {
                    objRespuestaDataJurisdiccionEntrega.error = true;
                    log.debug("obtenerDatosJurisdiccionEntrega", "Error - obtenerDatosJurisdiccionEntrega - No existe la información de la retención a duplicar o la información de la jurisdicción de entrega está vacía");
                }

                log.debug("obtenerDatosJurisdiccionEntrega", "RETURN - objRespuestaDataJurisdiccionEntrega: " + JSON.stringify(objRespuestaDataJurisdiccionEntrega));
                log.debug("obtenerDatosJurisdiccionEntrega", "FIN - obtenerDatosJurisdiccionEntrega");
                return objRespuestaDataJurisdiccionEntrega;
            } catch (e) {
                objRespuestaDataJurisdiccionEntrega.error = true;
                log.error("obtenerDatosJurisdiccionEntrega", "obtenerDatosJurisdiccionEntrega - Error Excepción - Netsuite Error: " + e.message);
                return null;
            }
        }

        function obtenerDatosJurisdiccionCordoba(infoRet, esAliados) {

            try {

                log.debug("obtenerDatosJurisdiccionCordoba", "INICIO - obtenerDatosJurisdiccionCordoba");
                log.debug("obtenerDatosJurisdiccionCordoba", "Parámetros: infoRet: " + JSON.stringify(infoRet) + " - esAliados: " + esAliados);

                var objRespuestaDataCordoba = {};
                objRespuestaDataCordoba.error = false;

                if (!isEmpty(infoRet)) {
                    objRespuestaDataCordoba.codigo = infoRet.codigo;
                    objRespuestaDataCordoba.cuenta = infoRet.cuenta;
                    objRespuestaDataCordoba.codigoJurisdiccionDireccionEntrega = "";
                    objRespuestaDataCordoba.idJurisdiccionDireccionEntrega = "";
                    objRespuestaDataCordoba.importe_factura_pagar = infoRet.importe_factura_pagar;
                    objRespuestaDataCordoba.condicion = infoRet.condicion;
                    objRespuestaDataCordoba.condicionID = infoRet.condicionID;
                    objRespuestaDataCordoba.jurisdiccion = infoRet.jurisdiccion;
                    objRespuestaDataCordoba.porcentajeRetencion = parseFloat(parseFloat(convertToInteger(infoRet.alicuotaRetencionEspecial), 10) / (100 * Math.pow(10, countDecimales(infoRet.alicuotaRetencionEspecial))), 10).toString();
                    objRespuestaDataCordoba.certExencion = infoRet.certExencion;
                    objRespuestaDataCordoba.tipoExencion = infoRet.tipoExencion;
                    objRespuestaDataCordoba.fcaducidadExencion = infoRet.fcaducidadExencion;
                    objRespuestaDataCordoba.jurisdiccionCodigo = infoRet.jurisdiccionCodigo;
                    objRespuestaDataCordoba.estadoInscripcionPadron = infoRet.estadoInscripcionPadron;
                    objRespuestaDataCordoba.coeficienteRetencion = infoRet.coeficienteRetencion;
                    objRespuestaDataCordoba.esPadron = infoRet.esPadron;
                    objRespuestaDataCordoba.porcentaje_alicuota_utilizar = infoRet.porcentaje_alicuota_utilizar;
                    objRespuestaDataCordoba.alicuota_especial = infoRet.alicuota_especial;
                    objRespuestaDataCordoba.idConvenioLocal = infoRet.idConvenioLocal;
                    objRespuestaDataCordoba.idConvenioMultilateral = infoRet.idConvenioMultilateral;
                    objRespuestaDataCordoba.idResponsableInscripto = infoRet.idResponsableInscripto;
                    objRespuestaDataCordoba.idMonotrotributista = infoRet.idMonotrotributista;
                    objRespuestaDataCordoba.porcentajeEspecialCoeficienteCero = infoRet.porcentajeEspecialCoeficienteCero;
                    objRespuestaDataCordoba.porcentajeAlicUtilSedeNoTucuman = infoRet.porcentajeAlicUtilSedeNoTucuman;
                    objRespuestaDataCordoba.jurisdiccionTexto = infoRet.jurisdiccionTexto;
                    objRespuestaDataCordoba.alicuotaRetencionEspecial = infoRet.alicuotaRetencionEspecial;
                    objRespuestaDataCordoba.importe_total_factura_aliados = infoRet.importe_total_factura_aliados;
                    objRespuestaDataCordoba.esRetencionAliados = esAliados;
                    objRespuestaDataCordoba.porcentajeEspecialUtilizarBI = infoRet.porcentajeEspecialUtilizarBI;
                    objRespuestaDataCordoba.criterioPorcentajeEspecial = infoRet.criterioPorcentajeEspecial;
                } else {
                    objRespuestaDataCordoba.error = true;
                    log.debug("obtenerDatosJurisdiccionCordoba", "Error - obtenerDatosJurisdiccionCordoba - No existe la información de la retención a duplicar o la información de la jurisdicción de entrega está vacía");
                }

                log.debug("obtenerDatosJurisdiccionCordoba", "RETURN - objRespuestaDataCordoba: " + JSON.stringify(objRespuestaDataCordoba));
                log.debug("obtenerDatosJurisdiccionCordoba", "FIN - obtenerDatosJurisdiccionCordoba");
                return objRespuestaDataCordoba;
            } catch (e) {
                objRespuestaDataCordoba.error = true;
                log.error("obtenerDatosJurisdiccionCordoba", "obtenerDatosJurisdiccionCordoba - Error Excepción - Netsuite Error: " + e.message);
                return null;
            }
        }

        function obtener_jurisdicciones_entrega_facturas(resultsNetosVBForRetIIBB) {

            try {
                var arrayJurisdiccionesEntregaFacturas = [];
                log.debug("obtener_jurisdicciones_entrega_facturas", "INICIO - obtener_jurisdicciones_entrega_facturas");
                log.debug("obtener_jurisdicciones_entrega_facturas", "Parámetros: resultsNetosVBForRetIIBB: " + JSON.stringify(resultsNetosVBForRetIIBB));

                for (var i = 0; i < resultsNetosVBForRetIIBB.length; i++) {
                    if (!isEmpty(resultsNetosVBForRetIIBB[i].jurisdiccionEntregaID) && !isEmpty(resultsNetosVBForRetIIBB[i].jurisdiccionEntregaCodigo)) {
                        arrayJurisdiccionesEntregaFacturas.push(resultsNetosVBForRetIIBB[i]);
                    }
                }

                log.debug("obtener_jurisdicciones_entrega_facturas", "RETURN - arrayJurisdiccionesEntregaFacturas: " + JSON.stringify(arrayJurisdiccionesEntregaFacturas));
                log.debug("obtener_jurisdicciones_entrega_facturas", "FIN - obtener_jurisdicciones_entrega_facturas");
                return arrayJurisdiccionesEntregaFacturas;

            } catch (e) {
                log.error("obtener_jurisdicciones_entrega_facturas", "obtener_jurisdicciones_entrega_facturas - Error Excepción - Netsuite Error: " + e.message);
                return null;
            }
        }

        function obtener_info_jurisdicciones_config_general(jurisdicciones) {

            try {

                log.debug("obtener_info_jurisdicciones_config_general", "INICIO - obtener_info_jurisdicciones_config_general");
                log.debug("obtener_info_jurisdicciones_config_general", "Parámetros: jurisdicciones: " + JSON.stringify(jurisdicciones));
                var arrayJurisdiccionesGenerales = [];

                /* Filtros */
                var filtros = [];
                var filtro = {};
                filtro.name = "internalid";
                filtro.operator = "ANYOF";
                filtro.values = jurisdicciones;

                filtros.push(filtro);

                var objResultSet = utilidades.searchSavedPro("customsearch_l54_zona_impuestos_retencio", filtros);
                if (objResultSet.error) {
                    log.error("obtener_info_jurisdicciones_config_general", "Error en consulta de SS de customsearch_l54_zona_impuestos_retencio");
                    return null;
                }

                var resultSet = objResultSet.objRsponseFunction.result;
                var resultSearch = objResultSet.objRsponseFunction.search;

                //log.debug(proceso, "SET: " + JSON.stringify(resultSet));
                //log.debug(proceso, "SEARCH: " + JSON.stringify(resultSearch));

                if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {

                    for (var i = 0; !utilidades.isEmpty(resultSet) && i < resultSet.length; i++) {
                        var info = {};

                        info.idJurisdiccion = resultSet[i].getValue({ name: resultSearch.columns[0] });
                        info.nombreJurisdiccion = resultSet[i].getValue({ name: resultSearch.columns[1] });
                        info.codigoJurisdiccion = resultSet[i].getValue({ name: resultSearch.columns[2] });

                        arrayJurisdiccionesGenerales.push(info);
                    }
                } else {
                    log.error("obtener_info_jurisdicciones_config_general", "obtener_info_jurisdicciones_config_general - No se obtuvieron resultados de jurisdicciones generales");
                }

                log.debug("obtener_info_jurisdicciones_config_general", "RETURN - arrayJurisdiccionesGenerales: " + JSON.stringify(arrayJurisdiccionesGenerales));
                log.debug("obtener_info_jurisdicciones_config_general", "FIN - obtener_info_jurisdicciones_config_general");
                return arrayJurisdiccionesGenerales;

            } catch (e) {
                log.error("obtener_info_jurisdicciones_config_general", "Error - Netsuite Error: " + e.message);
                return null;
            }
        }

        //Parsea una fecha String a Objeto Fecha de JavaScript. Con el parametro OffSet se puede mover N cantidad de dias.
        function parseDate(fecha, offsetInDays) {

            if (!utilidades.isEmpty(fecha)) {
                var parseDate = format.parse({
                    value: fecha,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_BUENOS_AIRES
                });

                if (isDate(parseDate) && !utilidades.isEmpty(offsetInDays) && offsetInDays != 0) {
                    parseDate = new Date(parseDate.setDate(parseDate.getDate() + offsetInDays)); //Se suma el offset en la fecha
                }

                return parseDate;
            }
        }

        //Convierte un Objeto Fecha JavaScript en un String con el formato del usuario actual
        function formatDate(fecha) {

            if (!utilidades.isEmpty(fecha)) {
                return format.format({
                    value: fecha,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_BUENOS_AIRES
                });
            }
        }

        //Identifica si una Fecha String es una fecha valida para ser convertida
        function isDate(fecha) {
            return fecha instanceof Date && !isNaN(fecha.valueOf());
        }

        function getCompanyDate(fecha) {
            var currentDateTime = new Date(fecha);
            var companyTimeZone = config.load({ type: config.Type.COMPANY_INFORMATION }).getText({ fieldId: "timezone" });
            var timeZoneOffSet = (companyTimeZone.indexOf("(GMT)") == 0) ? 0 : Number(companyTimeZone.substr(4, 6).replace(/\+|:00/gi, "").replace(/:30/gi, ".5"));
            var UTC = currentDateTime.getTime() + (currentDateTime.getTimezoneOffset() * 60000);
            var companyDateTime = UTC + (timeZoneOffSet * 60 * 60 * 1000);

            return new Date(companyDateTime);
        }

        function getDate(fecha, zonaHoraria) { //Toma una fecha ubicada en otra zona horaria y la mueve a GMT0. Con zonaHoraria se puede cambiar por otra diferente a GMT0
            var utc = new Date(fecha); //GMT 0
            zonaHoraria = isEmpty(zonaHoraria) ? 0 : zonaHoraria;
            utc = utc.getTime() + (utc.getTimezoneOffset() * 60000);
            return new Date(utc + (3600000 * zonaHoraria));
        }

        function checkFacturasAliados(dataFacturas) {

            var proceso = "checkFacturasAliados";
            var facturasAliados = 0;
            var facturasNormales = 0;
            var idFacturasNormales = "";
            var idFacturasAliados = "";
            var response = { error: false, mensaje: "", esRetencionAliados: false };

            try {
                for (var i = 0; i < dataFacturas.length; i++) {
                    if (dataFacturas[i].esFacturaAliados == "T") {
                        facturasAliados++;
                        idFacturasAliados += isEmpty(idFacturasAliados) ? dataFacturas[i].referenceNumberTransaction : ", " + dataFacturas[i].referenceNumberTransaction;
                    } else {
                        facturasNormales++;
                        idFacturasNormales += isEmpty(idFacturasNormales) ? dataFacturas[i].referenceNumberTransaction : ", " + dataFacturas[i].referenceNumberTransaction;
                    }
                }

                if (facturasAliados > 0 && facturasNormales > 0) {
                    response.error = true;
                    response.mensaje += "Error: Se está intentando realizar el Pago de facturas de \"Aliados\" en conjunto con Facturas que son de proveedores normales o viceversa. \n";
                    response.mensaje += "Las facturas con el REF NO.: " + idFacturasNormales + ", son facturas de proveedores normales y las facturas con el REF NO.: " + idFacturasAliados + ", son facturas de \"Aliados\"; las mismas no pueden pagarse en conjunto";
                } else {
                    response.esRetencionAliados = (facturasAliados > 0) ? true : false;
                    response.error = false;
                }
            } catch (error) {
                log.error(proceso, "Error - NetSuite excepción - Detalles: " + error.message);
                response.error = true;
                response.mensaje += proceso + " - Error - NetSuite excepción - Detalles: " + error.message;
            }

            return response;
        }

        function getAmountOk(resultsPagPasFact, id_vendorbill, importe_total_factura_final, importe_total_factura_a_pagar) {

            var proceso = "getAmountOk";
            var importe_final = 0.0;
            try {
                log.debug(proceso, "INICIO - getAmountOk - Parámetros resultsPagPasFact: " + JSON.stringify(resultsPagPasFact) + " - id_vendorbill: " + id_vendorbill + " -  importe_total_factura_final: " + importe_total_factura_final + " - importe_total_factura_a_pagar: " + importe_total_factura_a_pagar);

                // Se determina el total de importes brutos pagados anteriormente para cada factura, y así calcular bien su importe total a pagar para la retención de Córdoba
                if (!isEmpty(resultsPagPasFact) && resultsPagPasFact.length > 0) {

                    var impBrutoFactPagosPasados = parseFloat(obtener_imp_factura_pasado_pagada(resultsPagPasFact, id_vendorbill), 10);
                    var impBrutoTotalFactPagar = impBrutoFactPagosPasados + importe_total_factura_final; // sumo el importe que ya ha sido pagado anteriormente con el que se quiere pagar ahora

                    // Se verifica si la suma de importes brutos de pagos pasados excede el importe bruto de la factura a pagar, esto se hace para no tomar en cuenta el monto en la base de calculo y asignarle 0
                    if (impBrutoFactPagosPasados >= importe_total_factura_a_pagar) {
                        importe_final = 0.0;
                    } else {
                        // Se verifica si la suma de los importes brutos pagados anteriormente + el nuevo importe bruto de la factura a pagar sobrepasa el importe bruto total de la factura a pagar
                        // Si lo sobrepasa, entonces al importe de la factura a pagar le asigno lo que resta de pago permitido para esa factura, este caso es para cuando existen líneas de iva no gravado y no las toma en cuenta
                        // De esta manera no se excede el pago de una factura de su importe bruto permitido
                        if (impBrutoTotalFactPagar > importe_total_factura_a_pagar) {
                            importe_final = importe_total_factura_a_pagar - impBrutoFactPagosPasados;
                        }
                    }
                } else {
                    if (importe_total_factura_final > importe_total_factura_a_pagar) {
                        importe_final = importe_total_factura_a_pagar;
                    } else {
                        importe_final = importe_total_factura_final;
                    }
                }

                log.debug(proceso, "FIN - getAmountOk");
            } catch (error) {
                log.error(proceso, "Error NetSuite Excepción - getAmountOk - Detalles: " + error.message);
            }

            return importe_final;
        }

        return {
            onRequest: onRequest
        };
    });