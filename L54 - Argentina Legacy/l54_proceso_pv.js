/*
3KSYS - PERCEPCIONES EN VENTAS - SERVIDOR
VERSION 1.0 - 2015
DESARROLLADO POR 3KSYS
 */

//MODIFICACIONES
/*Fecha: 06-Dic-2016 	Por: FDS1 	 Descripcion : Cambio para que el calcular percepciones devuelva tambien las lineas que tienen percepcion 0
12/09/2017: Cambio para excluir de las percepciones a las facturas letra E
13/09/2017: Cambio para excluir de las percepciones a los contribuyentes que no tengan tildado el campo Calcula Percepcion
25/06/2019: Incorporación de mejorar por las percepciones de Salta y su configuración
*/

Number.prototype.toFixedOK = function (decimals) {
	var sign = this >= 0 ? 1 : -1;
	return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
}

function isEmpty(value) {
	return value === '' || value === null || value === undefined || value === 'null' || value === 'undefined';
}

Number.prototype.toFixedDown = function (digits) {
	var re = new RegExp("(\\d+\\.\\d{" + digits + "})(\\d)"),
		m = this.toString().match(re);
	return m ? parseFloat(m[1]) : this.valueOf();
}

// Función que permite devolver un número truncado a dos decimales
function numberTruncTwoDec(nStr) {
	x = nStr.toString().split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '.00';
	x2 = x2.length < 3 ? x2 + '0' : x2.substring(0, 3);
	return x1 + x2;
}

function esOneworld() {
	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	new nlobjSearchFilter('custrecord_l54_es_oneworld', null, 'is', 'T')];

	var searchresults = new nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, filters, null);

	if (searchresults != null && searchresults.length > 0)
		return true;
	else
		return false;
}

/*
Agrega un boton en el modo Create o Copy para Calcular las Percepciones en VENTAS de una Transaccion.
 */
function generarBotonCalcularPV(type, form) {
	if (type == 'create' || type == 'edit' || type == 'copy') {
		form.setScript('customscript_l54_calc_perc_ventas_cli');
		form.addButton('custpage_boton_generar_pv', 'Calcular PV', "calcular_percepcion_ventas()");
	}
}

/*
Obtiene la Informacion de la Configuracion General de Percepciones y Retenciones.
 */
function obtener_pv_iibb_conf_general(subsidiaria) {

	var filtroConfGeneral = new Array();
	filtroConfGeneral[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	if (!isEmpty(subsidiaria)) {
		filtroConfGeneral[1] = new nlobjSearchFilter('custrecord_l54_pv_gral_subsidiaria', null, 'is', subsidiaria);
	}

	var columnasConfGeneral = [new nlobjSearchColumn('custrecord_l54_pv_gral_jur_vinculada'),
	new nlobjSearchColumn('custrecord_l54_pv_gral_estado_exento'),
	];

	var resultadosConfGeneral = nlapiSearchRecord('customrecord_l54_pv_iibb_config_general', null, filtroConfGeneral, columnasConfGeneral);

	if (resultadosConfGeneral != null && resultadosConfGeneral.length > 0)
		return resultadosConfGeneral[0];
	else
		return null;
}

/*
Obtiene la Informacion de la Configuracion de Detalle de Percepciones y Retenciones en base a la Jurisdiccion.
 */
function obtener_pv_iibb_conf_detalle(jurisdiccion) {

	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	new nlobjSearchFilter('custrecord_l54_pv_det_jurisdiccion', null, 'anyof', jurisdiccion)];

	var columns = [new nlobjSearchColumn('custrecord_l54_pv_det_jurisdiccion'),
	new nlobjSearchColumn('custrecord_l54_pv_det_imp_general'),
	new nlobjSearchColumn('custrecord_l54_pv_det_item_percepcion'),
	new nlobjSearchColumn('custrecord_l54_pv_det_minimo'),
	new nlobjSearchColumn('custrecord_l54_pv_det_min_neto')];

	var results = nlapiSearchRecord('customrecord_l54_pv_iibb_config_detalle', null, filters, columns);

	if (results != null && results.length > 0)
		return results[0];
	else
		return new Array();
}

function obtener_pv_iibb_jur_cliente(jurisdiccion, cliente) {

	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	new nlobjSearchFilter('custrecord_l54_pv_jc_jurisdiccion', null, 'anyof', jurisdiccion),
	new nlobjSearchFilter('custrecord_l54_pv_jc_cliente', null, 'anyof', cliente)];

	var columns = [new nlobjSearchColumn('custrecord_l54_pv_jc_cliente'),
	new nlobjSearchColumn('custrecord_l54_pv_jc_jurisdiccion'),
	new nlobjSearchColumn('custrecord_l54_pv_jc_codigo_impuesto'),
	new nlobjSearchColumn('custrecord_l54_pv_jc_estado'),
	new nlobjSearchColumn('custrecord_l54_pv_jc_fecvento')];

	var results = nlapiSearchRecord('customrecord_l54_pv_iibb_jur_cliente', null, filters, columns);

	if (results != null && results.length > 0)
		return results[0];
	else
		return new Array();
}

/*
Obtiene la informacion de Codigos de Impuesto de Percepcion para un Determinado Producto y Jurisdiccion.
 */
function obtener_pv_iibb_jur_producto(arregloCodigosPercepcionIIBBProducto, jurisdiccion, producto) {
	var codigoPercepcionIIBB = new Object();
	codigoPercepcionIIBB.codigo = "";
	codigoPercepcionIIBB.alicuota = "";
	if (arregloCodigosPercepcionIIBBProducto != null && arregloCodigosPercepcionIIBBProducto.length > 0 && !isEmpty(jurisdiccion) && !isEmpty(producto)) {
		var resultadoCodigosPercepcionPadronIIBBProducto = arregloCodigosPercepcionIIBBProducto.filter(function (obj) {
			return (obj.jurisdiccion === jurisdiccion && obj.producto === producto);
		});

		if (!isEmpty(resultadoCodigosPercepcionPadronIIBBProducto) && resultadoCodigosPercepcionPadronIIBBProducto.length > 0) {
			codigoPercepcionIIBB.alicuota = "";
			codigoPercepcionIIBB.codigo = resultadoCodigosPercepcionPadronIIBBProducto[0].codigo;
			codigoPercepcionIIBB.alicuota = resultadoCodigosPercepcionPadronIIBBProducto[0].alicuota;
			return codigoPercepcionIIBB;
		} else
			return null;
	} else {
		return null;
	}
	return codigoPercepcionIIBB;
}

function obtenerArreglo_pv_iibb_jur_producto() {
	var arregloCodigosPercepcionIIBBProducto = new Array();
	/*var arregloCodigosPercepcionIIBBProducto = new Object();
	arregloCodigosPercepcionIIBBProducto.codigo="";
	arregloCodigosPercepcionIIBBProducto.alicuota="";
	arregloCodigosPercepcionIIBBProducto.jurisdiccion="";
	arregloCodigosPercepcionIIBBProducto.producto="";*/

	var filtroProducto = [new nlobjSearchFilter('isinactive', null, 'is', 'F')];

	var columnaProducto = new Array();
	columnaProducto[0] = new nlobjSearchColumn('custrecord_l54_pv_pja_cod_impuesto');
	columnaProducto[1] = new nlobjSearchColumn('custrecord_l54_pv_pja_alic_percepcion');
	columnaProducto[2] = new nlobjSearchColumn('custrecord_l54_pv_pja_jurisdiccion');
	columnaProducto[3] = new nlobjSearchColumn('custrecord_l54_pv_pja_producto');

	var resultadoProducto = nlapiSearchRecord('customrecord_l54_pv_iibb_prod_jur_act', null, filtroProducto, columnaProducto);
	if (resultadoProducto != null && resultadoProducto.length > 0) {
		for (var i = 0; i < resultadoProducto.length; i++) {
			arregloCodigosPercepcionIIBBProducto[i] = new Object();
			arregloCodigosPercepcionIIBBProducto[i].codigo = resultadoProducto[i].getValue('custrecord_l54_pv_pja_cod_impuesto');
			arregloCodigosPercepcionIIBBProducto[i].alicuota = resultadoProducto[i].getValue('custrecord_l54_pv_pja_alic_percepcion');
			arregloCodigosPercepcionIIBBProducto[i].jurisdiccion = resultadoProducto[i].getValue('custrecord_l54_pv_pja_jurisdiccion');
			arregloCodigosPercepcionIIBBProducto[i].producto = resultadoProducto[i].getValue('custrecord_l54_pv_pja_producto');
		}
	}
	return arregloCodigosPercepcionIIBBProducto;
}

function obtener_registro_padron_ARBA(cliente, jurisdiccionARBA) {

	var tmp = new Array();

	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	new nlobjSearchFilter('custrecord_l54_pv_pa_cliente', null, 'is', cliente),
	new nlobjSearchFilter('custrecord_l54_pv_pa_fec_inicio', null, 'onorbefore', 'today'),
	new nlobjSearchFilter('custrecord_l54_pv_pa_fec_fin', null, 'onorafter', 'today')];

	var columns = [new nlobjSearchColumn('custrecord_l54_pv_pa_alic_percep')];

	var results = nlapiSearchRecord('customrecord_l54_pv_iibb_arba', null, filters, columns);

	if (results != null && results.length > 0) {

		var filters_1 = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		new nlobjSearchFilter('custrecord_l54_pv_iibb', null, 'is', 'T'),
		new nlobjSearchFilter('custrecord_l54_pv_jurisdiccion', null, 'is', jurisdiccionARBA)];

		var columns_1 = [new nlobjSearchColumn('internalid'),
		new nlobjSearchColumn('itemid'),
		new nlobjSearchColumn('description'),
		new nlobjSearchColumn('rate')];

		var results_1 = nlapiSearchRecord('salestaxitem', null, filters_1, columns_1);

		for (var i = 0; results_1 != null && i < results_1.length; i++) {

			if (parseFloat(results_1[i].getValue('rate').substring(0, results_1[i].getValue('rate').indexOf("%") - 1)) == parseFloat(results[0].getValue('custrecord_l54_pv_pa_alic_percep'))) {

				tmp['codigo_impuesto'] = results_1[i].getValue('internalid');
				return tmp;
			}
		}

		return tmp;
	} else
		return new Array();
}

function impuesto_ARBA(impuestoPorcentaje) {

	var tmp = new Array();
	recConfGeneral = obtener_pv_iibb_conf_general();

	if (recConfGeneral.length == 0) {

		alert('Proceso de verificaciÃ³n de PadrÃ³n ARBA finalizado. No se encuentra definida la parametrizaciÃ³n general.');
		return true;
	}

	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	new nlobjSearchFilter('custrecord_l54_pv_iibb', null, 'is', 'T'),
	new nlobjSearchFilter('custrecord_l54_pv_jurisdiccion', null, 'anyof', recConfGeneral.getValue('custrecord_l54_pv_gral_jur_arba'))];

	var columns = [new nlobjSearchColumn('internalid'),
	new nlobjSearchColumn('itemid'),
	new nlobjSearchColumn('description'),
	new nlobjSearchColumn('rate')];

	var results = nlapiSearchRecord('salestaxitem', null, filters, columns);

	for (var i = 0; results != null && i < results.length; i++) {

		//alert(parseFloat(results[i].getValue('rate').substring(0, results[i].getValue('rate').indexOf("%")-1)));
		//alert(parseFloat(impuestoPorcentaje));

		if (parseFloat(results[i].getValue('rate').substring(0, results[i].getValue('rate').indexOf("%") - 1)) == parseFloat(impuestoPorcentaje)) {

			tmp['codigo_impuesto'] = results[i].getValue('internalid');
			return tmp;
		}
	}

	return new Array();
}

/*
Obtiene la informacion de un Impuesto en Particular.
 */
function obtener_impuesto(arregloImpuestos, impuesto) {

	var informacionImpuesto = new Object();
	informacionImpuesto.encontrado = false;
	informacionImpuesto.nombre = "";
	if (arregloImpuestos != null && arregloImpuestos.length > 0 && !isEmpty(impuesto)) {
		var resultadoImpuestos = arregloImpuestos.filter(function (obj) {
			return (obj.impuesto === impuesto);
		});

		if (!isEmpty(resultadoImpuestos) && resultadoImpuestos.length > 0) {
			informacionImpuesto.encontrado = true;

			informacionImpuesto.descripcion = resultadoImpuestos[0].descripcion;
			informacionImpuesto.porcentaje = resultadoImpuestos[0].porcentaje;
			informacionImpuesto.nombre = resultadoImpuestos[0].nombre;
			// Nuevo - Norma de IIBB de Percepcion
			informacionImpuesto.normaIIBB = resultadoImpuestos[0].normaIIBB;
			return informacionImpuesto;
		} else {
			return null;
		}
	} else {
		return null;
	}
}

function obtenerArreglo_impuesto(subsidiaria) {

	var informacionArregloImpuesto = new Array();
	/*var informacionArregloImpuesto = new Object();
	informacionArregloImpuesto.nombre="";
	informacionArregloImpuesto.impuesto="";
	informacionArregloImpuesto.descripcion="";
	informacionArregloImpuesto.porcentaje="";
	informacionArregloImpuesto.normaIIBB="";*/

	var filtroImpuesto = new Array();
	filtroImpuesto[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	if (!isEmpty(subsidiaria)) {
		filtroImpuesto[1] = new nlobjSearchFilter('subsidiary', null, 'is', subsidiaria);
	}

	var columnaImpuesto = [new nlobjSearchColumn('description'),
	new nlobjSearchColumn('rate'),
	new nlobjSearchColumn('itemid'),
	new nlobjSearchColumn('custrecord_l54_cod_norma'),
	new nlobjSearchColumn('internalid')];

	var resultadoImpuesto = nlapiSearchRecord('salestaxitem', null, filtroImpuesto, columnaImpuesto);

	if (resultadoImpuesto != null && resultadoImpuesto.length > 0) {
		for (var i = 0; i < resultadoImpuesto.length; i++) {
			informacionArregloImpuesto[i] = new Object();
			informacionArregloImpuesto[i].impuesto = resultadoImpuesto[i].getValue('internalid');
			informacionArregloImpuesto[i].descripcion = resultadoImpuesto[i].getValue('description');
			informacionArregloImpuesto[i].porcentaje = resultadoImpuesto[i].getValue('rate');
			informacionArregloImpuesto[i].nombre = resultadoImpuesto[i].getValue('itemid');
			// Nuevo - Norma de IIBB de Percepcion
			informacionArregloImpuesto[i].normaIIBB = resultadoImpuesto[i].getValue('custrecord_l54_cod_norma');
		}
	}

	return informacionArregloImpuesto;
}

/*
Funcion Encargada de Calcular las Percepciones en VENTAS
 */
function calcular_percepcion_ventas() {
	try {
		var context = nlapiGetContext();
		var remaining = context.getRemainingUsage();
		var jurisdiccionNoPosee = context.getSetting('SCRIPT', 'custscript_l54_juris_no_posee');
		var jurisdiccionCordoba = context.getSetting('SCRIPT', 'custscript_l54_cal_perc_vent_jur_cordoba');
		var param_codigo_IVA = context.getSetting('SCRIPT', 'custscript_l54_calc_percep_tip_per_iva');

		var paramAplicaEnLaProvincia = context.getSetting('SCRIPT', 'custscript_l54_cal_pe_vtas_ap_cal_en_pr');
		var paramAplicaFueraProvincia = context.getSetting('SCRIPT', 'custscript_l54_cal_pe_vtas_ap_cal_fue_pr');
		var paramNoAplicaProvincia = context.getSetting('SCRIPT', 'custscript_l54_cal_pe_vtas_ap_cal_no_apl');
		var paramJurisdTucuman = context.getSetting('SCRIPT', 'custscript_l54_cal_pe_vtas_tucuman');

		nlapiLogExecution("DEBUG", 'Calcular Percepciones en Ventas - INICIO', "Unidades Disponibles :" + remaining);
		nlapiLogExecution("DEBUG", 'Calcular Percepciones en Ventas - Param_Codigo_IVA', "Codigo de retencion :" + param_codigo_IVA);

		var respuestaPercepciones = new Object();
		respuestaPercepciones.error = false;
		respuestaPercepciones.warning = false;
		respuestaPercepciones.mensajeError = new Array();
		respuestaPercepciones.mensajeWarning = new Array();
		respuestaPercepciones.mensajeOk = "";
		respuestaPercepciones.infoPercepciones = new Array();
		respuestaPercepciones.cantidadLineasPercepcion = 0;
		respuestaPercepciones.codigo_IVA = param_codigo_IVA;
		//Informacion Impuesto Interno
		respuestaPercepciones.errorImpInt = false;
		respuestaPercepciones.warningImpInt = false;
		respuestaPercepciones.mensajeErrorImpInt = new Array();
		respuestaPercepciones.mensajeWarningImpInt = new Array();
		respuestaPercepciones.mensajeOkImpInt = "";
		respuestaPercepciones.infoImpuestoInterno = new Array();
		respuestaPercepciones.cantidadLineasImpInt = 0;
		respuestaPercepciones.detalleAcumulados = [];
		var infoLineasJurisdiccionesIIBB = [];

		var infoTransaccion = request.getParameter('informacionTransaccion');

		if (!isEmpty(infoTransaccion)) {
			nlapiLogExecution("DEBUG", 'Calcular Percepciones en Ventas', "Parametros Entrada:" + infoTransaccion);
			var informacionTransaccion = JSON.parse(infoTransaccion);

			if (informacionTransaccion != null) {

				var calcularPercepciones = informacionTransaccion.calcularPercepciones;
				var clienteTransaccion = informacionTransaccion.cliente;
				var idTransaccion = informacionTransaccion.idTransaccion;
				var coeficienteBaseImponible = informacionTransaccion.coeficienteBaseImponible;
				var subsidiariaTransaccion = informacionTransaccion.subsidiaria;
				var subsidiariaTransaccionText = informacionTransaccion.subsidiariaText;
				var tipoContribuyente = informacionTransaccion.tipoContribuyente;
				var totalDiscount = Math.abs(parseFloat(informacionTransaccion.totalDiscount, 10));
				var periodo = informacionTransaccion.periodo;
				var trandate = informacionTransaccion.trandate;
				trandate = getDate(trandate);
				trandate.setHours(0, 0, 0, 0);
				// Se consulta la Configuración General IIBB de la empresa para determinar su configuración y jurisdicciones
				var recConfGeneral = obtenerJurisdiciconesAgentePercepcion(subsidiariaTransaccion);
				// Acá se buscan los datos de las jurisdicciones que están marcadas como obligatorias en la config general IIBB con el campo de calcular Percepción CABA, calcular Percepción BUE, calcular Percepcion 
				var jurisdiccionesObligatorias = obtenerInfoJurisdiccionesObligatorias(recConfGeneral.calcularPercepcionCABA, recConfGeneral.calcularPercepcionBUE, recConfGeneral.calcularPercepcionTUCUMAN);
				var arrayJurisdiccionEntrega = obtenerJurisdiccionesEntrega(informacionTransaccion.articulos, jurisdiccionNoPosee);
				
				
				// INICIO - Obtengo los codigos de las jurisdicciones de entrega
				
				var resultJurisdiccionesEntrega = (!isEmpty(arrayJurisdiccionEntrega) && arrayJurisdiccionEntrega.length > 0) ? obtenerInfoJurisdEntrega(arrayJurisdiccionEntrega) : null;
				nlapiLogExecution('DEBUG', 'calcular_percepcion_ventas', 'LINE 391 - resultJurisdiccionesEntrega: ' + JSON.stringify(resultJurisdiccionesEntrega));
				
				// FIN - Obtengo los codigos de las jurisdicciones de entrega


				/* INICIO - RECORRIDO DE LINEAS DE ARTICULOS RECIBIDOS DESDE SCRITS QUE LLAMAN AL SUITELET */

				var esJurisdUtilizacion = false;
				var esJurisdOrigen = false;
				var esJurisdEntrega = false;
				var esJurisdFact = false;
				var esJurisdEmpresa = false;

				if (informacionTransaccion.articulos.length > 0) {
					for (var i = 0; i < informacionTransaccion.articulos.length; i++) {

						var infoArticulos = informacionTransaccion.articulos[i];

						/* INICIO - Agregar informacion de jurisdiccion de utilizacion en las lineas */
						if (!isEmpty(infoArticulos) && !isEmpty(infoArticulos.jurisdUtilizacion)) {

							esJurisdUtilizacion = true;
							esJurisdOrigen = false;
							esJurisdEntrega = false;
							esJurisdFact = false;
							esJurisdEmpresa = false;
							
							/* SE DEBE UTILIZAR UNA VARIABLE PARA ALMACENAR LAS JURISDICCIONES DE UTILIZACION */
							infoLineasJurisdiccionesIIBB = agregarJurisdiccionesIIBB(infoLineasJurisdiccionesIIBB, infoArticulos.jurisdUtilizacion, infoArticulos.importeNetoLinea, infoArticulos.nombreJurisdUtilizacion, esJurisdUtilizacion, esJurisdOrigen, esJurisdEntrega, infoArticulos.importeBrutoLinea, infoArticulos.lineNumber, esJurisdFact, infoArticulos, paramAplicaEnLaProvincia, paramAplicaFueraProvincia, paramNoAplicaProvincia, esJurisdEmpresa);
						}

						/* FIN - Agregar informacion de jurisdiccion de utilizacion en las lineas */

						/* INICIO - Agregar informacion de jurisdiccion de origen en las lineas */

						if (!isEmpty(infoArticulos) && !isEmpty(infoArticulos.jurisdOrigen)) {
							
							esJurisdUtilizacion = false;
							esJurisdOrigen = true;
							esJurisdEntrega = false;
							esJurisdFact = false;
							esJurisdEmpresa = false;

							/* SE DEBE UTILIZAR UNA VARIABLE PARA ALMACENAR LAS JURISDICCIONES DE ORIGEN */
							infoLineasJurisdiccionesIIBB = agregarJurisdiccionesIIBB(infoLineasJurisdiccionesIIBB, infoArticulos.jurisdOrigen, infoArticulos.importeNetoLinea, infoArticulos.nombreJurisdOrigen, esJurisdUtilizacion, esJurisdOrigen, esJurisdEntrega, infoArticulos.importeBrutoLinea, infoArticulos.lineNumber, esJurisdFact, infoArticulos, paramAplicaEnLaProvincia, paramAplicaFueraProvincia, paramNoAplicaProvincia, esJurisdEmpresa);
						}
						
						/* FIN - Agregar informacion de jurisdiccion de origen en las lineas */

						/* INICIO - Agregar informacion de jurisdiccion de destino en las lineas */

						if (!isEmpty(infoArticulos) && !isEmpty(infoArticulos.jurisdiccionEntrega)) {
							
							esJurisdUtilizacion = false;
							esJurisdOrigen = false;
							esJurisdEntrega = true;
							esJurisdFact = false;
							esJurisdEmpresa = false;

							/* SE DEBE UTILIZAR UNA VARIABLE PARA ALMACENAR LAS JURISDICCIONES DE DESTINO/ENTREGA */
							infoLineasJurisdiccionesIIBB = agregarJurisdiccionesIIBB(infoLineasJurisdiccionesIIBB, infoArticulos.jurisdiccionEntrega, infoArticulos.importeNetoLinea, infoArticulos.jurisdiccionEntregaNombre, esJurisdUtilizacion, esJurisdOrigen, esJurisdEntrega, infoArticulos.importeBrutoLinea, infoArticulos.lineNumber, esJurisdFact, infoArticulos, paramAplicaEnLaProvincia, paramAplicaFueraProvincia, paramNoAplicaProvincia, esJurisdEmpresa);
						}
						
						/* FIN - Agregar informacion de jurisdiccion de destino en las lineas */


						/* INICIO - Agregar informacion de jurisdiccion de facturacion en las lineas */

						if (!isEmpty(infoArticulos) && !isEmpty(infoArticulos.jurisdFacturacion)) {
							
							esJurisdUtilizacion = false;
							esJurisdOrigen = false;
							esJurisdEntrega = false;
							esJurisdFact = true;
							esJurisdEmpresa = false;

							/* SE DEBE UTILIZAR UNA VARIABLE PARA ALMACENAR LAS JURISDICCIONES DE DESTINO/ENTREGA */
							infoLineasJurisdiccionesIIBB = agregarJurisdiccionesIIBB(infoLineasJurisdiccionesIIBB, infoArticulos.jurisdFacturacion, infoArticulos.importeNetoLinea, infoArticulos.nombreJurisdFacturacion, esJurisdUtilizacion, esJurisdOrigen, esJurisdEntrega, infoArticulos.importeBrutoLinea, infoArticulos.lineNumber, esJurisdFact, infoArticulos, paramAplicaEnLaProvincia, paramAplicaFueraProvincia, paramNoAplicaProvincia, esJurisdEmpresa);
						}
						
						/* FIN - Agregar informacion de jurisdiccion de facturacion en las lineas */


						/* INICIO - Agregar informacion de jurisdiccion de empresa en las lineas */

						if (!isEmpty(infoArticulos) && !isEmpty(infoArticulos.jurisdEmpresa)) {
							
							esJurisdUtilizacion = false;
							esJurisdOrigen = false;
							esJurisdEntrega = false;
							esJurisdFact = false;
							esJurisdEmpresa = true;

							/* SE DEBE UTILIZAR UNA VARIABLE PARA ALMACENAR LAS JURISDICCIONES DE DESTINO/ENTREGA */
							infoLineasJurisdiccionesIIBB = agregarJurisdiccionesIIBB(infoLineasJurisdiccionesIIBB, infoArticulos.jurisdEmpresa, infoArticulos.importeNetoLinea, infoArticulos.nombreJurisdEmpresa, esJurisdUtilizacion, esJurisdOrigen, esJurisdEntrega, infoArticulos.importeBrutoLinea, infoArticulos.lineNumber, esJurisdFact, infoArticulos, paramAplicaEnLaProvincia, paramAplicaFueraProvincia, paramNoAplicaProvincia, esJurisdEmpresa);
						}
						
						/* FIN - Agregar informacion de jurisdiccion de empresa en las lineas */
					}
				}

				/* FIN - RECORRIDO DE LINEAS DE ARTICULOS RECIBIDOS DESDE SCRITS QUE LLAMAN AL SUITELET */


				var total = informacionTransaccion.total;
				var subTotal = informacionTransaccion.subTotal;
				var tipoCambio = parseFloat(informacionTransaccion.tipoCambio, 10);
				if (isEmpty(tipoCambio)) {
					tipoCambio = 1.00;
				}
				var costoEnvio = informacionTransaccion.costoEnvio;

				if (!isEmpty(clienteTransaccion) && !isEmpty(total)) {

					if (isEmpty(subTotal)) {
						subTotal = total;
					}else if(!isEmpty(informacionTransaccion.discounttotal) && informacionTransaccion.discounttotal != 0){
						subTotal = subTotal - Math.abs(informacionTransaccion.discounttotal);
					  }

					// Verificar si se deben Calcular Percepciones
					if (calcularPercepciones == true) {

						// verifico si esta cargada la parametrizaciÃ³n general
						if (isEmpty(recConfGeneral) || (!isEmpty(recConfGeneral) && (recConfGeneral.confGeneralDefinida == false && recConfGeneral.idConfGeneral == 0)) || (!isEmpty(recConfGeneral) && (recConfGeneral.idEstadoExento == 0 || recConfGeneral.idTipoContribIIBBDefault == 0))) {
							var mensaje = 'Proceso PV finalizado. No se encuentra definida la parametrizaciÃ³n general';
							if ((!isEmpty(recConfGeneral) && recConfGeneral.confGeneralDefinida != false && recConfGeneral.idConfGeneral != 0)) {
								mensaje = 'Proceso PV finalizado. No se encuentra correctamente configurada la parametrizaciÃ³n general';
							}
							if (!isEmpty(subsidiariaTransaccion)) {
								mensaje = mensaje + ' para la Subsidiaria : ' + subsidiariaTransaccionText;
							}
							mensaje = mensaje + '.';

							respuestaPercepciones.error = true;
							respuestaPercepciones.mensajeError.push(mensaje);
						}

						if (respuestaPercepciones.error == false) {

							// Inicio Obtener Jurisdicciones Cliente
							var objEstadoInscripcionJurIIBB = new Object();
							objEstadoInscripcionJurIIBB.iibb = false;
							objEstadoInscripcionJurIIBB = getClienteInscriptoRegimenIIBB(clienteTransaccion, recConfGeneral.idEstadoExento, recConfGeneral.jurisdicciones, recConfGeneral.idTipoContribIIBBDefault, recConfGeneral.idTipoContribIIBBDefaultText, coeficienteBaseImponible, jurisdiccionesObligatorias, trandate, resultJurisdiccionesEntrega);

							if (objEstadoInscripcionJurIIBB.warning == true) {
								respuestaPercepciones.warning = true;
								respuestaPercepciones.mensajeWarning.push(objEstadoInscripcionJurIIBB.mensajeWarning);
							}



							/* INICIO UNIFICAR INFORMACION DE JURISDICCIONES POR INSCRIPCION Y POR LINEAS */
                            objEstadoInscripcionJurIIBB = unificarJurisdPorLineasInscripcion(objEstadoInscripcionJurIIBB, infoLineasJurisdiccionesIIBB, subTotal, total, paramAplicaEnLaProvincia, paramAplicaFueraProvincia, paramNoAplicaProvincia);                             
							// var objJurisdUnificado = unificarJurisdPorLineasInscripcion(objEstadoInscripcionJurIIBB, infoLineasJurisdiccionesIIBB, subTotal, total, paramAplicaEnLaProvincia, paramAplicaFueraProvincia, paramNoAplicaProvincia);
							// nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'LINE 507 - objJurisdUnificado: ' + JSON.stringify(objJurisdUnificado));
							nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'LINE 507 - objEstadoInscripcionJurIIBB: ' + JSON.stringify(objEstadoInscripcionJurIIBB));

							/* FIN UNIFICAR INFORMACION DE JURISDICCIONES POR INSCRIPCION Y POR LINEAS */



							// Fin Obtener Jurisdicciones Cliente
							if (objEstadoInscripcionJurIIBB != null) {
								if (objEstadoInscripcionJurIIBB.iibb = true) {
									var codigosRetencionIIBB = obtenerCodigosPercepcionIIBB(clienteTransaccion, subsidiariaTransaccion, objEstadoInscripcionJurIIBB, recConfGeneral.idConfGeneral, tipoCambio, costoEnvio, tipoContribuyente, paramNoAplicaProvincia);

									if (codigosRetencionIIBB != null && codigosRetencionIIBB.error == false) {
										if (codigosRetencionIIBB.warning == true) {
											respuestaPercepciones.warning = true;
											respuestaPercepciones.mensajeWarning.push(codigosRetencionIIBB.mensajeWarning);
										}
										if (codigosRetencionIIBB.infoPer != null) {
											if (codigosRetencionIIBB.infoPer.length > 0) {
												var indiceItems = 0;
												var mensajeConfigTucumanErronea = '';
												var mensajeConfigCordoba = '';
												var mensajesErrores = '';

												// Se obtienen todas las jurisdicciones que son acumuladas del cliente
												var jurisdAcumuladas = obtenerJurisAcumuladas(codigosRetencionIIBB.infoPer).jurisdAcumuladas;
												
												// Se obtienen las transacciones del mes filtrando por todas las jurisdicciones que son acumuladas
												var resultTransPercJurisdMens = obtenerTransConPercep(clienteTransaccion, periodo, subsidiariaTransaccion, jurisdAcumuladas, idTransaccion).registros;
												var existenPercParaTodasJurisd = resultTransPercJurisdMens.existenPercParaTodasJurisd;

												var infoAcumPorJurisdicciones = (!isEmpty(jurisdAcumuladas) && jurisdAcumuladas.length > 0 && !existenPercParaTodasJurisd) ? obtenerAcumPorJurisdicciones(clienteTransaccion, periodo, subsidiariaTransaccion, jurisdAcumuladas, tipoCambio, idTransaccion) : null;

												nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'codigosRetencionIIBB.infoPer: ' + JSON.stringify(codigosRetencionIIBB.infoPer));

												for (var i = 0; i < codigosRetencionIIBB.infoPer.length; i++) {


													// INICIO - Se debe ingresar los valores de los acumulados en este punto antes de hacerle alguna modificacion a la base de calculo de la retencion.

													respuestaPercepciones.detalleAcumulados.push(extraerAcumuladoPorJurisdiccion(codigosRetencionIIBB.infoPer[i], clienteTransaccion, subsidiariaTransaccion, periodo, tipoCambio));
                                                    
													// FIN - Se debe ingresar los valores de los acumulados en este punto antes de hacerle alguna modificacion a la base de calculo de la retencion.


													nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'INICIO - recorrido de jurisdicciones finales / jurisdiccion: ' + codigosRetencionIIBB.infoPer[i].jurisdiccionTexto + ' / baseCalcAcumulada: ' + codigosRetencionIIBB.infoPer[i].baseCalcAcumulada);
													
													// var superaMinBaseCalc = true;
													var superaMinBaseCalc = false;
													var porcentajeEspecialUtilizarBI = '';
													var existenPercJurisdActual = existenPercParaTodasJurisd;

													if (!isEmpty(codigosRetencionIIBB.infoPer[i].baseCalcAcumulada) && codigosRetencionIIBB.infoPer[i].baseCalcAcumulada && !isEmpty(infoAcumPorJurisdicciones) && infoAcumPorJurisdicciones.registros.length > 0) {

														// Se verifica si existe un acumulado por jurisdiccion, esto quiere decir que ya se supero el acumulado del mes y no es necesario calcular por el acumulado
														var validarPercPasadas = validarPercJurisdiccion(resultTransPercJurisdMens, codigosRetencionIIBB.infoPer[i].jurisdiccion);
														existenPercJurisdActual = validarPercPasadas.existenPercepciones;

														// Si no hay percepciones o registros de transacciones donde existan percepciones asociada a la jurisdiccion actual se procede a validar importe mensual acumulado
														if (!validarPercPasadas.existenPercepciones) {

															var objImpAcumuladoMensual = obtenerImpAcumMens(infoAcumPorJurisdicciones.registros, codigosRetencionIIBB.infoPer[i].jurisdiccion);
															nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'Ingreso a validacion de importes acumulados poruqe no existen percepciones anteriores / jurisdiccion: ' + codigosRetencionIIBB.infoPer[i].jurisdiccionTexto);

															// Se evalua si existen importes acumulados mensuales
															if (!isEmpty(objImpAcumuladoMensual) && !objImpAcumuladoMensual.error && objImpAcumuladoMensual.registro.length > 0 &&
																!isNaN(objImpAcumuladoMensual.registro[0].impBaseCalculoAcumulada) && parseFloat(objImpAcumuladoMensual.registro[0].impBaseCalculoAcumulada, 10) > 0) {

																codigosRetencionIIBB.infoPer[i].importe += parseFloat(parseFloat(objImpAcumuladoMensual.registro[0].impBaseCalculoAcumulada, 10) / parseFloat(tipoCambio, 10), 10);
															}
														}
													}

													if (!isEmpty(codigosRetencionIIBB.infoPer[i].porcentajeEspecialUtilizarBI)) {
														if (codigosRetencionIIBB.infoPer[i].porcentajeEspecialUtilizarBI.search('%') != -1)
															porcentajeEspecialUtilizarBI = codigosRetencionIIBB.infoPer[i].porcentajeEspecialUtilizarBI.substring(0, codigosRetencionIIBB.infoPer[i].porcentajeEspecialUtilizarBI.length - 1);
														else
															porcentajeEspecialUtilizarBI = (parseFloat(codigosRetencionIIBB.infoPer[i].porcentajeEspecialUtilizarBI, 10) * 100);

														porcentajeEspecialUtilizarBI = porcentajeEspecialUtilizarBI / 100;

														if (parseFloat(countDecimales(parseFloat(porcentajeEspecialUtilizarBI, 10)), 10) > 10)
															porcentajeEspecialUtilizarBI = parseFloat(parseFloat(porcentajeEspecialUtilizarBI, 10).toFixedOK(2), 10);
													}


													if (!isEmpty(codigosRetencionIIBB.infoPer[i].criterioPorcentajeEspecial) && codigosRetencionIIBB.infoPer[i].criterioPorcentajeEspecial == '1' && !isEmpty(porcentajeEspecialUtilizarBI)) {
														codigosRetencionIIBB.infoPer[i].importe = codigosRetencionIIBB.infoPer[i].importe * porcentajeEspecialUtilizarBI;

														if (parseFloat(countDecimales(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10)), 10) > 10)
															codigosRetencionIIBB.infoPer[i].importe = parseFloat(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10).toFixedOK(2), 10);
													}

													nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'line 640 - infojurisdiccion: ' + JSON.stringify(codigosRetencionIIBB.infoPer[i]));

													if ((isEmpty(codigosRetencionIIBB.infoPer[i].aplicarMinANeto) || codigosRetencionIIBB.infoPer[i].aplicarMinANeto == 'F' || codigosRetencionIIBB.infoPer[i].aplicarMinANeto == false || isEmpty(codigosRetencionIIBB.infoPer[i].importeMinimo)) || 
														(!isEmpty(codigosRetencionIIBB.infoPer[i].baseCalcAcumulada) && codigosRetencionIIBB.infoPer[i].baseCalcAcumulada && existenPercJurisdActual) ||
														(parseFloat(codigosRetencionIIBB.infoPer[i].importeMinimo, 10) < parseFloat(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10) * tipoCambio, 10))) {
															
															superaMinBaseCalc = true;
													}

													nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'jurisdiccion: ' + codigosRetencionIIBB.infoPer[i].jurisdiccionTexto + ' / superaMinBaseCalc: ' + superaMinBaseCalc);


													// INICIO - El calculo se hace despues de pasar el importe Minimo de retencion
													// o el calculo se hace cuando la base de calculo es sobre el neto
													if (!isEmpty(codigosRetencionIIBB.infoPer[i].criterioPorcentajeEspecial) && codigosRetencionIIBB.infoPer[i].criterioPorcentajeEspecial == '2' && !isEmpty(porcentajeEspecialUtilizarBI)) {
														
														codigosRetencionIIBB.infoPer[i].importe = codigosRetencionIIBB.infoPer[i].importe * porcentajeEspecialUtilizarBI;

														if (parseFloat(countDecimales(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10)), 10) > 10)
															codigosRetencionIIBB.infoPer[i].importe = parseFloat(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10).toFixedOK(2), 10);
													}


													if (superaMinBaseCalc) {

														codigosRetencionIIBB.infoPer[i].importe = parseFloat(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10).toFixedOK(2), 10);

														nlapiLogExecution('DEBUG', 'calcular_percepcion_ventas', 'LINE 471 - codigosRetencionIIBB.infoPer: ' + JSON.stringify(codigosRetencionIIBB.infoPer[i]) + ' - ÍNDICE: ' + i);
														var porcentajeImpuesto = 0;
														if (codigosRetencionIIBB.infoPer[i].porcentajeImpuesto.search('%') != -1) {
															porcentajeImpuesto = codigosRetencionIIBB.infoPer[i].porcentajeImpuesto.substring(0, codigosRetencionIIBB.infoPer[i].porcentajeImpuesto.length - 1);
														} else {
															// porcentajeImpuesto = parseFloat((parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoPer[i].porcentajeImpuesto, 10)), 10) * (100/parseFloat(Math.pow(10, countDecimales(parseFloat(codigosRetencionIIBB.infoPer[i].porcentajeImpuesto, 10))), 10))), 10);
															var cantidadDecimalesPorcentajeImpuesto = parseFloat(countDecimales(parseFloat(codigosRetencionIIBB.infoPer[i].porcentajeImpuesto, 10)), 10);
															if (cantidadDecimalesPorcentajeImpuesto > 2) {
																var cantidadUnidadesCero = cantidadDecimalesPorcentajeImpuesto - 2; // El -2 es por el 100, que tiene dos unidades de 0
																porcentajeImpuesto = parseFloat((parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoPer[i].porcentajeImpuesto, 10)), 10) / parseFloat(Math.pow(10, cantidadUnidadesCero))), 10);
															} else {
																porcentajeImpuesto = parseFloat((parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoPer[i].porcentajeImpuesto, 10)), 10) * (100 / parseFloat(Math.pow(10, cantidadDecimalesPorcentajeImpuesto), 10))), 10);
															}
														}


														nlapiLogExecution('DEBUG', 'calcular_percepcion_ventas', 'LINE 683 - porcentajeImpuesto: ' + porcentajeImpuesto + ' - coeficienteAlicuotaPerc: ' + codigosRetencionIIBB.infoPer[i].coeficienteAlicuotaPerc + ' - ÍNDICE: ' + i);
														
														var porcentajeFinal = Math.abs(parseFloat(porcentajeImpuesto, 10)) * parseFloat(codigosRetencionIIBB.infoPer[i].coeficienteAlicuotaPerc, 10);

														nlapiLogExecution('DEBUG', 'calcular_percepcion_ventas', 'LINE 494 - porcentajeFinal: ' + porcentajeFinal + ' - ÍNDICE: ' + i);
														var porcentajeAlicuotaEspecialCero = false;
														var ignorarPercepcionTucuman = false;


														
														// INICIO - Si la percepción a procesar es la de Tucuman.
														if (!isEmpty(codigosRetencionIIBB.infoPer[i].jurisdiccion) && ((codigosRetencionIIBB.infoPer[i].jurisdiccion == 24) || (codigosRetencionIIBB.infoPer[i].jurisdiccionCodigo == 924) || (codigosRetencionIIBB.infoPer[i].jurisdiccionTexto.search('924') != -1))) {
															// Si la configuración tomada proviene de Padrón o de IIBB Config General
															if (!isEmpty(codigosRetencionIIBB.infoPer[i].esPadron) && codigosRetencionIIBB.infoPer[i].esPadron) {
																// Si el tipo de contribuyente IIBB o estado de inscripción del padrón es Convenio Local o Local
																if (!isEmpty(codigosRetencionIIBB.infoPer[i].estadoInscripcionPadron) && !isEmpty(codigosRetencionIIBB.infoPer[i].idConvenioLocal) && codigosRetencionIIBB.infoPer[i].estadoInscripcionPadron == codigosRetencionIIBB.infoPer[i].idConvenioLocal) {
																	// Si la Condición fiscal == Responsable Inscripto && Jurisdiccion Percepcion calculada == Lugar Entrega && Lugar Entrega = Tucuman (924)
																	if (!isEmpty(tipoContribuyente) && !isEmpty(codigosRetencionIIBB.infoPer[i].idResponsableInscripto) && tipoContribuyente == codigosRetencionIIBB.infoPer[i].idResponsableInscripto) {
																		codigosRetencionIIBB.infoPer[i].importe = codigosRetencionIIBB.infoPer[i].importe;
																	} else {
																		// Si la Condición fiscal == Monotributista && Jurisdiccion Percepcion calculada == Lugar Entrega && Lugar Entrega = Tucuman (924)
																		if (!isEmpty(tipoContribuyente) && !isEmpty(codigosRetencionIIBB.infoPer[i].idMonotrotributista) && tipoContribuyente == codigosRetencionIIBB.infoPer[i].idMonotrotributista) {
																			codigosRetencionIIBB.infoPer[i].importe = codigosRetencionIIBB.infoPer[i].importeBrutoLinea;
																		} else {
																			// No debe calcularse percepción de TUCUMÁN por mala configuración de Padrón
																			codigosRetencionIIBB.infoPer[i].importe = 0;
																			ignorarPercepcionTucuman = true;
																			mensajeConfigTucumanErronea = 'No se calculará percepción de TUCUMÁN; el cliente tiene que ser Responsable Inscripto o Monotributista y la jurisdicción de entrega: TUCUMÁN, para aplicar el Padrón.';
																		}
																	}
																} else {
																	// Si el tipo de contribuyente IIBB o estado de inscripción del padrón es Convenio Multilateral
																	if (!isEmpty(codigosRetencionIIBB.infoPer[i].estadoInscripcionPadron) && !isEmpty(codigosRetencionIIBB.infoPer[i].idConvenioMultilateral) && codigosRetencionIIBB.infoPer[i].estadoInscripcionPadron == codigosRetencionIIBB.infoPer[i].idConvenioMultilateral && !isEmpty(codigosRetencionIIBB.infoPer[i].porcentaje_alicuota_utilizar)) {

																		// Verifico si la dirección de entrega no es TUCUMÁN, para asignar el porcentaje cuando la sede no es tucuman
																		if (!codigosRetencionIIBB.infoPer[i].esJurisdEntrega) {
																			codigosRetencionIIBB.infoPer[i].porcentaje_alicuota_utilizar = codigosRetencionIIBB.infoPer[i].porcentajeAlicUtilSedeNoTucuman;
																		}

																		// Aplico el porcentaje de alicuota a utilizar porque es convenio multilateral
																		if (codigosRetencionIIBB.infoPer[i].porcentaje_alicuota_utilizar.search('%') != -1)
																			var porcentajeAlicuotaEspecial = codigosRetencionIIBB.infoPer[i].porcentaje_alicuota_utilizar.substring(0, codigosRetencionIIBB.infoPer[i].porcentaje_alicuota_utilizar.length - 1);
																		else
																			var porcentajeAlicuotaEspecial = (parseFloat(codigosRetencionIIBB.infoPer[i].porcentaje_alicuota_utilizar, 10) * 100);

																		var countDecimalesPorcentajeFinal = countDecimales(parseFloat(porcentajeFinal, 10));
																		var countDecimalesPorcentajeAlicuotaEspecial = countDecimales(parseFloat(porcentajeAlicuotaEspecial, 10));
																		var countDecimalesPorcentajeTotal = countDecimalesPorcentajeFinal + countDecimalesPorcentajeAlicuotaEspecial;
																		porcentajeFinal = parseFloat(parseFloat(convertToInteger(parseFloat(porcentajeFinal, 10)), 10) * (parseFloat(convertToInteger(parseFloat(porcentajeAlicuotaEspecial, 10)), 10)) / (100 * Math.pow(10, countDecimalesPorcentajeTotal)), 10);

																		// Si la Condición fiscal == Responsable Inscripto && Jurisdiccion Percepcion calculada == Lugar Entrega && Lugar Entrega = Tucuman (924)
																		if (!isEmpty(tipoContribuyente) && !isEmpty(codigosRetencionIIBB.infoPer[i].idResponsableInscripto) && tipoContribuyente == codigosRetencionIIBB.infoPer[i].idResponsableInscripto && codigosRetencionIIBB.infoPer[i].esJurisdEntrega) {
																			codigosRetencionIIBB.infoPer[i].importe = codigosRetencionIIBB.infoPer[i].importe;
																		} else {
																			var coeficienteCero = false;
																			// Si la Condición fiscal == Monotributista && Jurisdiccion Percepcion calculada == Lugar Entrega && Lugar Entrega = Tucuman (924)
																			if (!isEmpty(tipoContribuyente) && !isEmpty(codigosRetencionIIBB.infoPer[i].idMonotrotributista) && tipoContribuyente == codigosRetencionIIBB.infoPer[i].idMonotrotributista && codigosRetencionIIBB.infoPer[i].esJurisdEntrega) {
																				codigosRetencionIIBB.infoPer[i].importe = codigosRetencionIIBB.infoPer[i].importeBrutoLinea;
																			} else {
																				// Verifico si el coeficiente es mayor a 0, para tomar en el caso de que sea 0 al porcentaje especial cuando el coeficiente es 0
																				if (!isEmpty(codigosRetencionIIBB.infoPer[i].coeficientePercepcion) && codigosRetencionIIBB.infoPer[i].coeficientePercepcion > 0) {
																					var countDecimalesCoeficiente = countDecimales(codigosRetencionIIBB.infoPer[i].coeficientePercepcion);
																				} else {
																					coeficienteCero = true;
																					if (codigosRetencionIIBB.infoPer[i].porcentajeEspecialCoeficienteCero.search('%') != -1) {
																						var porcentajeEspecialCoeficienteCero = codigosRetencionIIBB.infoPer[i].porcentajeEspecialCoeficienteCero.substring(0, codigosRetencionIIBB.infoPer[i].porcentajeEspecialCoeficienteCero.length - 1);
																					} else {
																						//var porcentajeEspecialCoeficienteCero = (parseFloat(codigosRetencionIIBB.infoPer[i].porcentajeEspecialCoeficienteCero, 10) * 100);
																						var porcentajeEspecialCoeficienteCero = parseFloat(codigosRetencionIIBB.infoPer[i].porcentajeEspecialCoeficienteCero, 10);
																					}
																					/* var countDecimalesPorcentEspecialCoefCero = countDecimales(porcentajeEspecialCoeficienteCero);
																					codigosRetencionIIBB.infoPer[i].coeficientePercepcion = parseFloat(parseFloat(convertToInteger(parseFloat(porcentajeEspecialCoeficienteCero, 10)), 10)/(100 * Math.pow(10, countDecimalesPorcentEspecialCoefCero)), 10);
																					var countDecimalesCoeficiente = countDecimales(codigosRetencionIIBB.infoPer[i].coeficientePercepcion); */
																				}

																				// Si la Condición fiscal == Responsable inscripto && Lugar Entrega <> Tucuman (924)
																				if (!isEmpty(tipoContribuyente) && !isEmpty(codigosRetencionIIBB.infoPer[i].idResponsableInscripto) && tipoContribuyente == codigosRetencionIIBB.infoPer[i].idResponsableInscripto && !codigosRetencionIIBB.infoPer[i].esJurisdEntrega) {
																					if (!coeficienteCero) {
																						var countDecimalesImporte = countDecimales(codigosRetencionIIBB.infoPer[i].importe);
																						var countDecimalesTotales = countDecimalesImporte + countDecimalesCoeficiente;
																						codigosRetencionIIBB.infoPer[i].importe = parseFloat(parseFloat(parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10)), 10) * parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoPer[i].coeficientePercepcion, 10)), 10), 10) / Math.pow(10, countDecimalesTotales), 10);
																					} else {
																						porcentajeFinal = parseFloat(porcentajeEspecialCoeficienteCero, 10);
																						codigosRetencionIIBB.infoPer[i].importe = codigosRetencionIIBB.infoPer[i].importe;
																					}
																				} else {
																					// Si la Condición fiscal == Monotibutista && Lugar Entrega <> Tucuman (924)
																					if (!isEmpty(tipoContribuyente) && !isEmpty(codigosRetencionIIBB.infoPer[i].idMonotrotributista) && tipoContribuyente == codigosRetencionIIBB.infoPer[i].idMonotrotributista && !codigosRetencionIIBB.infoPer[i].esJurisdEntrega) {
																						if (!coeficienteCero) {
																							var countDecimalesImporte = countDecimales(codigosRetencionIIBB.infoPer[i].importeBrutoLinea);
																							var countDecimalesTotales = countDecimalesImporte + countDecimalesCoeficiente;
																							codigosRetencionIIBB.infoPer[i].importe = parseFloat(parseFloat(parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoPer[i].importeBrutoLinea, 10)), 10) * parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoPer[i].coeficientePercepcion, 10)), 10), 10) / Math.pow(10, countDecimalesTotales), 10);
																						} else {
																							porcentajeFinal = parseFloat(porcentajeEspecialCoeficienteCero, 10);
																							codigosRetencionIIBB.infoPer[i].importe = codigosRetencionIIBB.infoPer[i].importeBrutoLinea;
																						}
																					} else {
																						codigosRetencionIIBB.infoPer[i].importe = 0;
																						ignorarPercepcionTucuman = true;
																						mensajeConfigTucumanErronea = 'No se calculará percepción de TUCUMÁN; el cliente tiene que ser Responsable Inscripto o Monotributista para aplicar el Padrón de la jurisdicción de TUCUMÁN.';
																					}
																				}
																			}
																		}
																	} else {
																		codigosRetencionIIBB.infoPer[i].importe = 0;
																		ignorarPercepcionTucuman = true;
																		mensajeConfigTucumanErronea = 'No se calculará percepción de TUCUMÁN; la configuración del Padrón se encuentra errónea; debe ser Convenio Multilateral o Convenio Local y debe llenar el "Porcentaje Alícuota Utilizar" en el RT IIBB Configuración Detalle';
																	}
																}
															} else { // No es por configuración de Padrón el cálculo de percepciones
																// Condición fiscal es Responsable Inscripto o Monotributista y lugar de entrega es TUCUMÁN
																if (!isEmpty(tipoContribuyente) && !isEmpty(codigosRetencionIIBB.infoPer[i].idResponsableInscripto) && !isEmpty(codigosRetencionIIBB.infoPer[i].idMonotrotributista) && (tipoContribuyente == codigosRetencionIIBB.infoPer[i].idResponsableInscripto || tipoContribuyente == codigosRetencionIIBB.infoPer[i].idMonotrotributista) && codigosRetencionIIBB.infoPer[i].esJurisdEntrega) {
																	if (tipoContribuyente == codigosRetencionIIBB.infoPer[i].idMonotrotributista) {
																		codigosRetencionIIBB.infoPer[i].importe = parseFloat(codigosRetencionIIBB.infoPer[i].importeBrutoLinea, 10) + parseFloat(totalDiscount, 10) + parseFloat(totalDiscount, 10);
																	} else {
																		codigosRetencionIIBB.infoPer[i].importe = parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10) + parseFloat(totalDiscount, 10) + parseFloat(totalDiscount, 10);
																	}
																} else {
																	// Condición fiscal es Responsable Inscripto o Monotributista y lugar de entrega NO es TUCUMÁN
																	if (!isEmpty(tipoContribuyente) && !isEmpty(codigosRetencionIIBB.infoPer[i].idResponsableInscripto) && !isEmpty(codigosRetencionIIBB.infoPer[i].idMonotrotributista) && (tipoContribuyente == codigosRetencionIIBB.infoPer[i].idResponsableInscripto || tipoContribuyente == codigosRetencionIIBB.infoPer[i].idMonotrotributista) && !codigosRetencionIIBB.infoPer[i].esJurisdEntrega && !isEmpty(codigosRetencionIIBB.infoPer[i].alicuota_especial)) {
																		if (tipoContribuyente == codigosRetencionIIBB.infoPer[i].idMonotrotributista) {
																			codigosRetencionIIBB.infoPer[i].importe = parseFloat(codigosRetencionIIBB.infoPer[i].importeBrutoLinea, 10) + parseFloat(totalDiscount, 10) + parseFloat(totalDiscount, 10);
																		} else {
																			codigosRetencionIIBB.infoPer[i].importe = parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10) + parseFloat(totalDiscount, 10) + parseFloat(totalDiscount, 10);
																		}

																		if (codigosRetencionIIBB.infoPer[i].alicuota_especial.search('%') != -1)
																			var alicuotaEspecial = codigosRetencionIIBB.infoPer[i].alicuota_especial.substring(0, codigosRetencionIIBB.infoPer[i].alicuota_especial.length - 1);
																		else
																			var alicuotaEspecial = (parseFloat(codigosRetencionIIBB.infoPer[i].alicuota_especial, 10) * 100);

																		porcentajeFinal = parseFloat(parseFloat(alicuotaEspecial, 10), 10);

																		if (porcentajeFinal <= parseFloat(0, 10))
																			porcentajeAlicuotaEspecialCero = true;
																	} else {
																		codigosRetencionIIBB.infoPer[i].importe = 0;
																		ignorarPercepcionTucuman = true;
																		mensajeConfigTucumanErronea = 'No se calculará percepción de TUCUMÁN; el cliente tiene que ser Responsable Inscripto o Monotributista y debe llenar la "Alícuota Especial" en el RT IIBB Configuración Detalle';
																	}
																}
															}
														}
														// FIN - Si la percepción a procesar es la de Tucuman.

														nlapiLogExecution('DEBUG', 'calcular_percepcion_ventas', 'LINE 618 - codigosRetencionIIBB.infoPer[i].importe: ' + codigosRetencionIIBB.infoPer[i].importe + ' - totalDiscount: ' + totalDiscount + ' - INDICE: ' + i);

														//if (!isEmpty(porcentajeFinal) && !porcentajeAlicuotaEspecialCero && !isNaN(porcentajeFinal) && porcentajeFinal >= 0 && !isNaN(codigosRetencionIIBB.infoPer[i].importe) && (parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10) > 0)) {
														if (!isEmpty(porcentajeFinal) && !ignorarPercepcionTucuman && !porcentajeAlicuotaEspecialCero && !isNaN(porcentajeFinal) && (porcentajeFinal >= 0 && codigosRetencionIIBB.infoPer[i].jurisdiccionCodigo == 924 || porcentajeFinal > 0)
															&& !isNaN(codigosRetencionIIBB.infoPer[i].importe) && (((parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10) >= 0) && (codigosRetencionIIBB.infoPer[i].jurisdiccionCodigo == 924)) || (parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10) > 0))) {

															if (parseFloat(countDecimales(parseFloat(porcentajeFinal, 10)), 10) > 13) {
																porcentajeFinal = parseFloat(parseFloat(porcentajeFinal, 10).toFixedOK(2), 10);
															}

															if (parseFloat(countDecimales(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10)), 10) > 13) {
																codigosRetencionIIBB.infoPer[i].importe = parseFloat(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10).toFixedOK(2), 10);
															} else {
																codigosRetencionIIBB.infoPer[i].importe = parseFloat(numberTruncTwoDec(codigosRetencionIIBB.infoPer[i].importe), 10);
															}

															// Multiplicación de Monto imponible * coeficiente y cálculo de Monto Imp Percepción
															if (isEmpty(codigosRetencionIIBB.infoPer[i].coeficienteBaseImponible) || isNaN(codigosRetencionIIBB.infoPer[i].coeficienteBaseImponible) || codigosRetencionIIBB.infoPer[i].coeficienteBaseImponible == 0.00) {
																codigosRetencionIIBB.infoPer[i].coeficienteBaseImponible = 1;
															}

															var montoImponiblePercOriginal = 0.0;
															var montoImponiblePerc = 0.0;
															var importePercCalculado = 0.0;
															var diferenciaRedondeo = 0.0;
															var importePercCalculadoRedondeado = 0.0; // importe de percepción
															var montoImponiblePercMonedaLocal = 0.0;
															var cantDecMontoImpPerc = 0; // montoImponiblePerc
															var cantDecPorcentFinal = 0; // porcentajeFinal
															var cantDecTotalMontoImpPorc = 0; // suma de cantDecMontoImpPerc y cantDecPorcentFinal
															var cantDecImporteNeto = 0; // importePercCalculadoRedondeado
															var cantDecTipoCambio = 0;
															var cantDecMontoImpPercMonedaLocal = 0;
															cantDecPorcentFinal = countDecimales(porcentajeFinal);

															if (!isNaN(codigosRetencionIIBB.infoPer[i].importe)) {
																nlapiLogExecution('DEBUG', 'calcular_percepcion_ventas', 'LINE 504 - Ingresa a setear los importes y la cantidad de decimales de los mismos; importe es un number: ' + codigosRetencionIIBB.infoPer[i].importe + ' - ÍNDICE: ' + i);
																var decimalesImporte = countDecimales(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10));
																var decimalesCoeficienteBaseImponible = countDecimales(parseFloat(codigosRetencionIIBB.infoPer[i].coeficienteBaseImponible, 10));
																var decimalesImporteCoeficienteTotal = decimalesImporte + decimalesCoeficienteBaseImponible;
																// montoImponiblePerc = Math.abs(parseFloat(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10) * parseFloat(codigosRetencionIIBB.infoPer[i].coeficienteBaseImponible,10), 10).toFixedOK(2)); // monto imp perc nuevo
																//montoImponiblePerc = Math.abs(parseFloat(numberTruncTwoDec(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10) * parseFloat(codigosRetencionIIBB.infoPer[i].coeficienteBaseImponible,10)), 10)); // monto imp perc nuevo
																montoImponiblePerc = Math.abs(parseFloat(numberTruncTwoDec(parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10)), 10) * parseFloat(convertToInteger(parseFloat(codigosRetencionIIBB.infoPer[i].coeficienteBaseImponible, 10)), 10) / (Math.pow(10, decimalesImporteCoeficienteTotal))), 10)); // monto imp perc nuevo
																//importePercCalculado = parseFloat(montoImponiblePerc * parseFloat((parseFloat(porcentajeFinal, 10) / 100), 10), 10).toFixedOK(2);
																cantDecMontoImpPerc = countDecimales(montoImponiblePerc);
																cantDecTotalMontoImpPorc = cantDecMontoImpPerc + cantDecPorcentFinal;
																importePercCalculado = Math.abs(parseFloat(((parseFloat(convertToInteger(montoImponiblePerc), 10) * parseFloat(convertToInteger(parseFloat(porcentajeFinal, 10)), 10)) / (100 * Math.pow(10, cantDecTotalMontoImpPorc))), 10));
																montoImponiblePercOriginal = Math.abs(parseFloat(codigosRetencionIIBB.infoPer[i].importe, 10));
																diferenciaRedondeo = parseFloat(importePercCalculado - parseFloat(importePercCalculado.toFixedDown(2), 10), 10);
															}

															var superaMinPerc = true;
															// Se evalua si existe importe minimo de percepcion y se 
															if (!isEmpty(codigosRetencionIIBB.infoPer[i].importeMinPercepcion) && !isNaN(codigosRetencionIIBB.infoPer[i].importeMinPercepcion) && parseFloat(codigosRetencionIIBB.infoPer[i].importeMinPercepcion, 10) > 0) {
																if (parseFloat(codigosRetencionIIBB.infoPer[i].importeMinPercepcion, 10) > parseFloat(importePercCalculado, 10)) {
																	superaMinPerc = false;
																}
															}

															nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'montoImponiblePerc: ' + montoImponiblePerc + ' / importePercCalculado: ' + importePercCalculado + ' / importeMinPercepcion: ' + codigosRetencionIIBB.infoPer[i].importeMinPercepcion + ' / superaMinPerc: ' + superaMinPerc);

															if (superaMinPerc) {

																respuestaPercepciones.infoPercepciones[indiceItems] = new Object();
																respuestaPercepciones.infoPercepciones[indiceItems].item = codigosRetencionIIBB.infoPer[i].item;
																respuestaPercepciones.infoPercepciones[indiceItems].descripcion = codigosRetencionIIBB.infoPer[i].descripcionImpuesto;
																respuestaPercepciones.infoPercepciones[indiceItems].cantidad = 1;
																respuestaPercepciones.infoPercepciones[indiceItems].importeUnitario = 0;
																respuestaPercepciones.infoPercepciones[indiceItems].importeTotal = 0;
																respuestaPercepciones.infoPercepciones[indiceItems].codigoImpuesto = codigosRetencionIIBB.infoPer[i].codigo;
																// Nuevo - Configurar porcentaje
																respuestaPercepciones.infoPercepciones[indiceItems].porcentaje = porcentajeFinal;
																respuestaPercepciones.infoPercepciones[indiceItems].jurisdiccion = "";
																respuestaPercepciones.infoPercepciones[indiceItems].montoImponiblePercMonedaLocal = 0.0;
																respuestaPercepciones.infoPercepciones[indiceItems].importePercMonedaLocal = 0.00;

																nlapiLogExecution('DEBUG', 'calcular_percepcion_ventas', 'LINE 526 - Jurisdiccion de la percepcion: ' + codigosRetencionIIBB.infoPer[i].jurisdiccion + ' - ÍNDICE: ' + i);
																if (!isEmpty(codigosRetencionIIBB.infoPer[i].jurisdiccion)) {
																	respuestaPercepciones.infoPercepciones[indiceItems].jurisdiccion = codigosRetencionIIBB.infoPer[i].jurisdiccion;
																	nlapiLogExecution('DEBUG', 'calcular_percepcion_ventas', 'LINE 530 - Código de Jurisdiccion de la percepcion: ' + codigosRetencionIIBB.infoPer[i].jurisdiccionCodigo + ' - ÍNDICE: ' + i);
																	importePercCalculadoRedondeado = parseFloat(numberTruncTwoDec(importePercCalculado), 10); // imp percepción redondeado
																	cantDecImporteNeto = countDecimales(importePercCalculadoRedondeado);
																	cantDecTipoCambio = countDecimales(tipoCambio);
																	cantDecMontoImpPercMonedaLocal = cantDecTipoCambio + cantDecImporteNeto - cantDecPorcentFinal;
																	nlapiLogExecution('AUDIT', 'calcular_percepcion_ventas', 'importe calculado redondeado: ' + parseFloat(convertToInteger(parseFloat(importePercCalculadoRedondeado, 10)), 10) + ', tipo Cambio: ' + parseFloat(convertToInteger(parseFloat(tipoCambio, 10)), 10) + ', alicuota: ' + parseFloat(convertToInteger(parseFloat(porcentajeFinal, 10)), 10) + 'cantDecMontoImpPercMonedaLocal: ' + cantDecMontoImpPercMonedaLocal);
																	montoImponiblePercMonedaLocal = Math.abs(parseFloat(parseFloat((parseFloat((parseFloat(parseFloat(convertToInteger(parseFloat(importePercCalculadoRedondeado, 10)), 10) * parseFloat(convertToInteger(parseFloat(tipoCambio, 10)), 10) * 100, 10) / parseFloat(convertToInteger(parseFloat(porcentajeFinal, 10)), 10)), 10) / Math.pow(10, cantDecMontoImpPercMonedaLocal)), 10), 10));
																	if (parseFloat(countDecimales(parseFloat(montoImponiblePercMonedaLocal, 10)), 10) > 13) {
																		montoImponiblePercMonedaLocal = parseFloat(parseFloat(montoImponiblePercMonedaLocal, 10).toFixedOK(2), 10);
																	}
																	nlapiLogExecution('AUDIT', 'calcular_percepcion_ventas', 'montoImponiblePercMonedaLocal: ' + montoImponiblePercMonedaLocal);
																	respuestaPercepciones.infoPercepciones[indiceItems].montoImponiblePercMonedaLocal = Math.abs(parseFloat(numberTruncTwoDec(montoImponiblePercMonedaLocal), 10)); 
																	nlapiLogExecution('AUDIT', 'calcular_percepcion_ventas', 'montoImponiblePercMonedaLocal obj: ' + respuestaPercepciones.infoPercepciones[indiceItems].montoImponiblePercMonedaLocal);
																	/** Cambio Importe Moneda Local **/
																	var amountPer = Math.abs(parseFloat(parseFloat(montoImponiblePercMonedaLocal, 10).toFixedOK(2), 10));
																	var alicuota = porcentajeFinal;
																	respuestaPercepciones.infoPercepciones[indiceItems].importePercMonedaLocal =  parseFloat(parseFloat(amountPer, 10) * (parseFloat(alicuota, 10)/100),10).toFixedOK(2);
																	nlapiLogExecution('DEBUG','Resultado del nuevo campo', respuestaPercepciones.infoPercepciones[indiceItems].importePercMonedaLocal)
																	respuestaPercepciones.infoPercepciones[indiceItems].montoImponibleOriginal = montoImponiblePerc;
																}

																respuestaPercepciones.infoPercepciones[indiceItems].procesoPV = 'T';
																// Nuevo - cambios para manejar importes y sus redondeos.
																respuestaPercepciones.infoPercepciones[indiceItems].importeImpuestoOriginal = importePercCalculado;
																respuestaPercepciones.infoPercepciones[indiceItems].importeImpuesto = importePercCalculadoRedondeado;
																respuestaPercepciones.infoPercepciones[indiceItems].montoImponible = montoImponiblePerc;
																respuestaPercepciones.infoPercepciones[indiceItems].diferenciaRedondeo = diferenciaRedondeo;
																// Nuevo - Coeficiente Base Imponible (Perc Salta)
																respuestaPercepciones.infoPercepciones[indiceItems].coeficienteBaseImponible = Math.abs(codigosRetencionIIBB.infoPer[i].coeficienteBaseImponible);
																respuestaPercepciones.infoPercepciones[indiceItems].montoImponiblePercOriginal = Math.abs(montoImponiblePercOriginal);
																// Nuevo - Norma IIBB
																respuestaPercepciones.infoPercepciones[indiceItems].normaIIBB = "";
																if (!isEmpty(codigosRetencionIIBB.infoPer[i].normaIIBB)) {
																	respuestaPercepciones.infoPercepciones[indiceItems].normaIIBB = codigosRetencionIIBB.infoPer[i].normaIIBB;
																}
																// Nuevo - Grabar Tipo Contribuyente IIBB
																respuestaPercepciones.infoPercepciones[indiceItems].tipoContribuyenteIIBB = "";
																if (!isEmpty(codigosRetencionIIBB.infoPer[i].condicionID)) {
																	respuestaPercepciones.infoPercepciones[indiceItems].tipoContribuyenteIIBB = codigosRetencionIIBB.infoPer[i].condicionID;
																}
																indiceItems = parseInt(indiceItems, 10) + parseInt(1, 10);
															} else {
																mensajesErrores += 'No se realizará el cálculo de percepción para la jurisdicción de ' + codigosRetencionIIBB.infoPer[i].jurisdiccionTexto + ' porque no se supera el mínimo de percepción configurado. \n';
																nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'mensajesErrores: ' + mensajesErrores);
															}
															//FDS1 }
														} else {
															if (!isEmpty(codigosRetencionIIBB.infoPer[i].jurisdiccion) && ((codigosRetencionIIBB.infoPer[i].jurisdiccion == 24) || (codigosRetencionIIBB.infoPer[i].jurisdiccionCodigo == 924) || (codigosRetencionIIBB.infoPer[i].jurisdiccionTexto.search('924') != -1)) && isEmpty(mensajeConfigTucumanErronea) && !porcentajeAlicuotaEspecialCero && ignorarPercepcionTucuman) {
																mensajeConfigTucumanErronea = 'No se realizará el cálculo de percepción para la jurisdicción de TUCUMÁN porque existe un error en el proceso de cálculo o la configuación se encuentra errónea. \n'
															} else {
																if (porcentajeAlicuotaEspecialCero)
																	mensajeConfigTucumanErronea = 'No se realizará el cálculo de percepción para la jurisdicción de TUCUMÁN porque la alícuota especial configurada es 0%. \n';
															}
														}
													} else {
														mensajesErrores += 'No se realizará el cálculo de percepción para la jurisdicción de ' + codigosRetencionIIBB.infoPer[i].jurisdiccionTexto + ' porque no se supera el mínimo de base de cálculo de percepción configurado. \n';
														nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'mensajesErrores: ' + mensajesErrores);
													}

													nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'FIN - recorrido de jurisdicciones finales');
												}

												respuestaPercepciones.error = false;

												//respuestaPercepciones.cantidadLineasPercepcion = codigosRetencionIIBB.infoPer.length;
												respuestaPercepciones.cantidadLineasPercepcion = indiceItems;
												nlapiLogExecution('DEBUG', 'calcular_percepcion_ventas', 'mensajeConfigTucumanErronea: ' + mensajeConfigTucumanErronea);
												/* cantidadPercepciones = !isEmpty(mensajeConfigTucumanErronea) ? parseInt((parseInt(codigosRetencionIIBB.infoPer.length, 10) - 1), 10) : codigosRetencionIIBB.infoPer.length;
												cantidadPercepciones = !isEmpty(mensajeConfigCordoba) ? parseInt((cantidadPercepciones - 1), 10) : cantidadPercepciones; */

												if (indiceItems > 0) {
													respuestaPercepciones.mensajeOk = mensajesErrores + mensajeConfigCordoba + mensajeConfigTucumanErronea + ' \n Proceso PV finalizado. Se agregaron la cantidad de líneas de percepciones en ventas: ' + indiceItems;
												} else {
													respuestaPercepciones.mensajeOk = mensajesErrores + mensajeConfigCordoba + mensajeConfigTucumanErronea + '\n Proceso PV finalizado. La Transaccion no genera Percepciones';
												}

												//alert('Proceso PV finalizado. Se agregaron la cantidad de lÃ­neas de percepciones en ventas: ' + codigosRetencionIIBB.infoPer.length);
												//return true;

											} else {
												respuestaPercepciones.error = false;
												respuestaPercepciones.cantidadLineasPercepcion = 0;
												respuestaPercepciones.mensajeOk = 'Proceso PV finalizado. No se generaron percepciones para esta venta, debido a que las jurisdicciones no generan percepciones.';
												//alert('Proceso PV finalizado. No se generaron percepciones para esta venta, debido a que las jurisdicciones no generan percepciones.');
												//return true;
											}
										} else {
											// Error Inesperado
											respuestaPercepciones.error = true;
											respuestaPercepciones.cantidadLineasPercepcion = 0;
											respuestaPercepciones.mensajeError.push('Proceso PV finalizado. Error Calculando las percepciones en ventas.');
											//alert('Proceso PV finalizado. Error Calculando las percepciones en ventas.');
											//return true;
										}
									} else {
										if (codigosRetencionIIBB != null && codigosRetencionIIBB.error == true) {
											respuestaPercepciones.error = true;
											respuestaPercepciones.cantidadLineasPercepcion = 0;
											respuestaPercepciones.mensajeError.push(codigosRetencionIIBB.mensajeError);
											respuestaPercepciones.mensajeError.push('Proceso PV Finalizado.');
										}
									}
									/*else{
									// Error Obteniendo los Impuestos de Percepcion
									alert ('Proceso PV finalizado. Error Obteniendo los Impuestos de Percepcion.');
									return true;
									}*/
								} else {
									respuestaPercepciones.error = false;
									respuestaPercepciones.cantidadLineasPercepcion = 0;
									respuestaPercepciones.mensajeOk = 'Proceso PV finalizado. No se tienen que calcular percepciones ventas.';
									//alert('Proceso PV finalizado. No se tienen que calcular percepciones ventas.');
									//return true;
								}
							} else {
								// Error Generando Percepciones
								respuestaPercepciones.error = true;
								respuestaPercepciones.cantidadLineasPercepcion = 0;
								respuestaPercepciones.mensajeError.push('Proceso PV finalizado. Error Calculando las percepciones en ventas mientras se extraen las jurisdicciones del cliente.');
								//alert('Proceso PV finalizado. Error Calculando las percepciones en ventas.');
								//return true;
							}
						}

					}
					else {
						respuestaPercepciones.error = false;
						respuestaPercepciones.cantidadLineasPercepcion = 0;
						if (informacionTransaccion.letra == 'E') respuestaPercepciones.mensajeOk = 'Proceso PV finalizado. Era una factura letra E.';
						else if (informacionTransaccion.llevaPercepcion == 'F') respuestaPercepciones.mensajeOk = 'Proceso PV finalizado. Era un ' + informacionTransaccion.nameTipoContribIIBB;
						else respuestaPercepciones.mensajeOk = 'Proceso PV finalizado. No se calcularon percepciones ventas.';
					}

					// INICIO Generacion de Impuesto Interno
					if (informacionTransaccion.informacionImpInterno != null) {
						if (informacionTransaccion.informacionImpInterno.calcularImp == true) {
							if (!isEmpty(informacionTransaccion.informacionImpInterno.montoImpInterno) && !isNaN(informacionTransaccion.informacionImpInterno.montoImpInterno)
								&& parseFloat(informacionTransaccion.informacionImpInterno.montoImpInterno, 10) > 0) {
								// Obtener Configuracion de Impuesto Interno
								var recConfGeneralImpInterno = obtenerConfImpuestoInterno(subsidiariaTransaccion);

								if (isEmpty(recConfGeneralImpInterno) || (!isEmpty(recConfGeneralImpInterno) && ((recConfGeneralImpInterno.confGeneralDefinida == false
									&& recConfGeneralImpInterno.idConfGeneral == 0))) || (!isEmpty(recConfGeneralImpInterno) && (recConfGeneralImpInterno.idArticuloImpInt == 0 ||
										recConfGeneralImpInterno.idCodigoImpuesto == 0))) {
									var mensaje = 'Proceso Calculo Impuesto Interno finalizado. No se encuentra definida la parametrizaciÃ³n general de Impuesto Interno';
									if ((!isEmpty(recConfGeneralImpInterno) && recConfGeneralImpInterno.confGeneralDefinida != false && recConfGeneralImpInterno.idConfGeneral != 0)) {
										mensaje = 'Proceso Calculo Impuesto Interno finalizado. No se encuentra configurada la siguiente informacion de la parametrizaciÃ³n general de Impuesto Interno : ';
										if (isEmpty(recConfGeneralImpInterno.idArticuloImpInt) || (!isEmpty(recConfGeneralImpInterno.idArticuloImpInt) && recConfGeneralImpInterno.idArticuloImpInt == 0)) {
											mensaje = mensaje + " Articulo a utilizar en el Calculo de Impuesto Interno / ";
										}
										if (isEmpty(recConfGeneralImpInterno.idCodigoImpuesto) || (!isEmpty(recConfGeneralImpInterno.idCodigoImpuesto) && recConfGeneralImpInterno.idCodigoImpuesto == 0)) {
											mensaje = mensaje + " Codigo de Impuesto a utilizar en el Calculo de Impuesto Interno / ";
										}
									}
									if (!isEmpty(subsidiariaTransaccion)) {
										mensaje = mensaje + ' para la Subsidiaria : ' + subsidiariaTransaccionText;
									}
									mensaje = mensaje + '.';

									respuestaPercepciones.errorImpInt = true;
									respuestaPercepciones.mensajeErrorImpInt.push(mensaje);
								}

								if (respuestaPercepciones.errorImpInt == false) {

									var indiceImpInt = 0;
									respuestaPercepciones.infoImpuestoInterno[indiceImpInt] = new Object();
									respuestaPercepciones.infoImpuestoInterno[indiceImpInt].item = recConfGeneralImpInterno.idArticuloImpInt;
									respuestaPercepciones.infoImpuestoInterno[indiceImpInt].cantidad = 1;
									respuestaPercepciones.infoImpuestoInterno[indiceImpInt].importeUnitario = 0;
									respuestaPercepciones.infoImpuestoInterno[indiceImpInt].importeTotal = 0;
									respuestaPercepciones.infoImpuestoInterno[indiceImpInt].codigoImpuesto = recConfGeneralImpInterno.idCodigoImpuesto;
									respuestaPercepciones.infoImpuestoInterno[indiceImpInt].baseCalculo = 0;
									if (isEmpty(recConfGeneralImpInterno.porcCodigoImpuesto)) {
										recConfGeneralImpInterno.porcCodigoImpuesto = 0.00;
									}
									respuestaPercepciones.infoImpuestoInterno[indiceImpInt].porcCodigoImpuesto = parseFloat(recConfGeneralImpInterno.porcCodigoImpuesto, 10);
									respuestaPercepciones.infoImpuestoInterno[indiceImpInt].impuestoInterno = 'T';
									respuestaPercepciones.infoImpuestoInterno[indiceImpInt].importeImpuesto = parseFloat(informacionTransaccion.informacionImpInterno.montoImpInterno, 10);
									respuestaPercepciones.infoImpuestoInterno[indiceImpInt].baseCalculo = parseFloat(informacionTransaccion.informacionImpInterno.baseCalculo, 10);

									indiceImpInt = parseInt(indiceImpInt, 10) + parseInt(1, 10);

									respuestaPercepciones.errorImpInt = false;
									respuestaPercepciones.cantidadLineasImpInt = indiceImpInt;
									if (indiceImpInt > 0)
										respuestaPercepciones.mensajeOkImpInt = 'Proceso Calculo Impuesto Interno finalizado. Se agregaron la cantidad de líneas de Impuestos Internos en ventas: ' + indiceImpInt;
									else
										respuestaPercepciones.mensajeOkImpInt = 'Proceso Calculo Impuesto Interno finalizado. La Transaccion no genera Impuestos Internos';

								}
							} else {
								// Error Obteniendo Monto de Impuesto Interno
								respuestaPercepciones.errorImpInt = true;
								var mensaje = "No se recibio Informacion del Monto de Impuestos Internos A Aplciar en la Transaccion";
								respuestaPercepciones.mensajeErrorImpInt.push(mensaje);
							}
						}
						else {
							respuestaPercepciones.errorImpInt = false;
							respuestaPercepciones.mensajeOkImpInt = 'Proceso Calculo Impuesto Interno finalizado. La Transaccion no genera Impuestos Internos';
						}
					} else {
						// Error Obteniendo Informacion de Impuesto Internos
						respuestaPercepciones.errorImpInt = true;
						var mensaje = "No se recibio Informacion de Impuestos Internos A Calcular";
						respuestaPercepciones.mensajeErrorImpInt.push(mensaje);

					}
					// FIN Generacion de Impuesto Interno
				} else {
					// Falta Ingresar Cliente o Articulos
					if (isEmpty(clienteTransaccion)) {
						respuestaPercepciones.error = true;
						respuestaPercepciones.cantidadLineasPercepcion = 0;
						respuestaPercepciones.mensajeError.push("El Proceso de Percepciones en Ventas requiere que se ingrese previamente un Cliente");
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
			respuestaPercepciones.mensajeError.push("Error Al Obtener la Informacion de la Transaccion");
		}
	} catch (err) {
		respuestaPercepciones.error = true;
		respuestaPercepciones.cantidadLineasPercepcion = 0;
		respuestaPercepciones.mensajeError.push("Error Calculando Percepciones - Error : " + err.message);
		nlapiLogExecution('ERROR', 'Calculo Percepciones', 'Error Calculando Percepciones en VENTAS - Error : ' + err.message);
	}

	var context = nlapiGetContext();
	var remaining = context.getRemainingUsage();
	nlapiLogExecution("DEBUG", 'Calcular Percepciones en Ventas - FIN', "Unidades Disponibles :" + remaining);

	var respuestaPercepcionesJSON = JSON.stringify(respuestaPercepciones);
	nlapiLogExecution("DEBUG", 'Calcular Percepciones en Ventas', "Respuesta/Salida:" + respuestaPercepcionesJSON);
	response.setContentType('JSON');
	response.writeLine(respuestaPercepcionesJSON);
}

function extraerAcumuladoPorJurisdiccion(infoCodigosPercepcionIIBB, clienteTransaccion, subsidiariaTransaccion, periodo, tipoCambio) {

	var proceso = 'extraerAcumuladoPorJurisdiccion';
	var infoAcumulado = {};
	nlapiLogExecution('DEBUG', proceso, 'INICIO - extraerAcumuladoPorJurisdiccion / clienteTransaccion: ' + clienteTransaccion + ' / subsidiariaTransaccion: ' + subsidiariaTransaccion + ' / periodo: ' + periodo + ' / infoCodigosPercepcionIIBB: ' + JSON.stringify(infoCodigosPercepcionIIBB));
	
	try {
		if (!isEmpty(infoCodigosPercepcionIIBB)) {
			infoAcumulado.cliente = clienteTransaccion;
			infoAcumulado.periodo = periodo;
			infoAcumulado.subsidiaria = subsidiariaTransaccion;
			infoAcumulado.baseCalculo = infoCodigosPercepcionIIBB.importe;
			infoAcumulado.jurisdiccion = infoCodigosPercepcionIIBB.jurisdiccion;
			infoAcumulado.tipoCambio = tipoCambio;
		}
	} catch (error) {
		nlapiLogExecution('ERROR', 'Error NetSuite Excepcion - extraerAcumuladoPorJurisdiccion, detalles: ' + error.message);
	}

	nlapiLogExecution('DEBUG', proceso, 'FIN - extraerAcumuladoPorJurisdiccion - infoAcumulado: ' + JSON.stringify(infoAcumulado));
	return infoAcumulado;

}



/* FUNCION ENCARGADA DE UNIFICAR INFORMACION DE JURISDICCIONES POR INSCRIPCION Y POR LINEAS */
function unificarJurisdPorLineasInscripcion(objEstadoInscripcionJurIIBB, infoLineasJurisdiccionesIIBB, importeNeto, importeBruto, paramAplicaEnLaProvincia, paramAplicaFueraProvincia, paramNoAplicaProvincia) {

	var proceso = 'unificarJurisdPorLineasInscripcion';
	var objJurisdUnificiado = {}
	objJurisdUnificiado.iibb = objEstadoInscripcionJurIIBB.iibb;
	objJurisdUnificiado.jurisdicciones = [];
	objJurisdUnificiado.warning = objEstadoInscripcionJurIIBB.warning;
	objJurisdUnificiado.mensajeWarning = objEstadoInscripcionJurIIBB.mensajeWarning;

	nlapiLogExecution('DEBUG', proceso, 'INICIO - unificarJurisdPorLineasInscripcion');

	try {
		if (!isEmpty(objEstadoInscripcionJurIIBB) && objEstadoInscripcionJurIIBB.jurisdicciones.length > 0) {

				for (var i = 0; i < objEstadoInscripcionJurIIBB.jurisdicciones.length; i++) {
					
					var encontrado = false;

					
					/* INICIO - SE RECORREN LAS JURISDICCIONES DE LINEAS PARA VALIDAR SI LAS DE LINEAS ESTAN INMERSAS EN LAS JURISDICCIONES INSCRIPTAS DEL PROVEEDOR */

					for (var j = 0; !isEmpty(infoLineasJurisdiccionesIIBB) && j < infoLineasJurisdiccionesIIBB.length; j++) {
						if (objEstadoInscripcionJurIIBB.jurisdicciones[i].jurisdiccion == infoLineasJurisdiccionesIIBB[j].jurisdiccion &&  
							(!objEstadoInscripcionJurIIBB.jurisdicciones[i].esJurisdEntrega || (objEstadoInscripcionJurIIBB.jurisdicciones[i].esJurisdEntrega && infoLineasJurisdiccionesIIBB[j].critJurisdEntrega == paramAplicaEnLaProvincia))
							) {

							encontrado = true;
							infoLineasJurisdiccionesIIBB[j].noCumpleMinimo = objEstadoInscripcionJurIIBB.jurisdicciones[i].noCumpleMinimo;
							infoLineasJurisdiccionesIIBB[j].jurisdiccion = objEstadoInscripcionJurIIBB.jurisdicciones[i].jurisdiccion;
							infoLineasJurisdiccionesIIBB[j].jurisdiccionTexto = objEstadoInscripcionJurIIBB.jurisdicciones[i].jurisdiccionTexto;
							infoLineasJurisdiccionesIIBB[j].tipoContribuyente = objEstadoInscripcionJurIIBB.jurisdicciones[i].tipoContribuyente;
							infoLineasJurisdiccionesIIBB[j].tipoContribuyenteTexto = objEstadoInscripcionJurIIBB.jurisdicciones[i].tipoContribuyenteTexto;
							infoLineasJurisdiccionesIIBB[j].coeficienteBaseImponible = objEstadoInscripcionJurIIBB.jurisdicciones[i].coeficienteBaseImponible;
							infoLineasJurisdiccionesIIBB[j].jurisdiccionCodigo = objEstadoInscripcionJurIIBB.jurisdicciones[i].jurisdiccionCodigo;
							infoLineasJurisdiccionesIIBB[j].esPercPadron = objEstadoInscripcionJurIIBB.jurisdicciones[i].esPercPadron;
							infoLineasJurisdiccionesIIBB[j].jurisdiccionSede = objEstadoInscripcionJurIIBB.jurisdicciones[i].jurisdiccionSede;
							// infoLineasJurisdiccionesIIBB[j].esJurisdEntrega = objEstadoInscripcionJurIIBB.jurisdicciones[i].esJurisdEntrega;
							infoLineasJurisdiccionesIIBB[j].aplicaCalcPercPorInscrip = objEstadoInscripcionJurIIBB.jurisdicciones[i].aplicaCalcPercPorInscrip;
							objJurisdUnificiado.jurisdicciones.push(infoLineasJurisdiccionesIIBB[j]);
							
						}
					}

					/* FIN - SE RECORREN LAS JURISDICCIONES DE LINEAS PARA VALIDAR SI LAS DE LINEAS ESTAN INMERSAS EN LAS JURISDICCIONES INSCRIPTAS DEL PROVEEDOR */


					/* INICIO - SI LA JURISDICCION INSCRIPTA QUE SE RECORRE NO SE ENCUENTRA EN LAS JURISDICCIONES DE LINEAS ENTONCES IGUAL SE INSERTA PORQUE ES UNA JURISDICCION DE LAS QUE ESTA INSCRIPTO, SIEMPRE QUE NO SEA DE ENTREGA SOLAMENTE */

					if (!encontrado && !objEstadoInscripcionJurIIBB.jurisdicciones[i].esJurisdEntrega) {
						objJurisdUnificiado.jurisdicciones.push(unificarInfoJurisdiccion(objEstadoInscripcionJurIIBB.jurisdicciones[i], importeNeto, importeBruto, paramNoAplicaProvincia));
					}

					/* FIN - SI LA JURISDICCION INSCRIPTA QUE SE RECORRE NO SE ENCUENTRA EN LAS JURISDICCIONES DE LINEAS ENTONCES IGUAL SE INSERTA PORQUE ES UNA JURISDICCION DE LAS QUE ESTA INSCRIPTO, SIEMPRE QUE NO SEA DE ENTREGA SOLAMENTE */
				}
		} else {
			nlapiLogExecution('ERROR', proceso, 'No se continua con el calculo de percepciones porque no esta inscripto en ninguna jurisdiccion');
		}
	} catch (error) {
		nlapiLogExecution('ERROR', proceso, 'Error NetSuite Excepcion al unificar jurisdicciones de lineas con las de inscripcion, detalles: ' + error.message);
	}

	nlapiLogExecution('DEBUG', proceso, 'FIN - unificarJurisdPorLineasInscripcion - respuesta: ' + JSON.stringify(objJurisdUnificiado));
	return objJurisdUnificiado;
}
/* FUNCION ENCARGADA DE UNIFICAR INFORMACION DE JURISDICCIONES POR INSCRIPCION Y POR LINEAS */


/* FUNCION ENCARGADA DE INSERTAR JURISDICCIONES */

function unificarInfoJurisdiccion(infoJurisdiccion, importeNeto, importeBruto, paramNoAplicaProvincia) {

	var proceso = 'unificarInfoJurisdiccion';
	nlapiLogExecution('DEBUG', proceso, 'INICIO - unificarInfoJurisdiccion');

	try {
		infoJurisdiccion.idArticulo = '';
		infoJurisdiccion.importeNetoLinea = parseFloat(importeNeto, 10);
		infoJurisdiccion.lineNumber = '';
		infoJurisdiccion.esJurisdUtilizacion = false;
		infoJurisdiccion.esJurisdOrigen = false;
		infoJurisdiccion.esJurisdEntrega = false;
		infoJurisdiccion.esJurisdFact = false;
		infoJurisdiccion.esJurisdEmpresa = false;
		infoJurisdiccion.importeBrutoLinea = parseFloat(importeBruto, 10);
		infoJurisdiccion.critJurisdUtilizacion = paramNoAplicaProvincia;
		infoJurisdiccion.critJurisdEntrega = paramNoAplicaProvincia;
		infoJurisdiccion.critJurisdOrigen = paramNoAplicaProvincia;
		infoJurisdiccion.critJurisdFacturacion = paramNoAplicaProvincia;
		infoJurisdiccion.critJurisdEmpresa = paramNoAplicaProvincia;
	} catch (error) {
		nlapiLogExecution('ERROR', proceso, 'Error NetSuite Excepcion, unificarInfoJurisdiccion, detalles: ' + error.message);
	}

	nlapiLogExecution('DEBUG', proceso, 'FIN - unificarInfoJurisdiccion');
	return infoJurisdiccion;
}


function agregarJurisdiccionesIIBB(objPercepcion, jurisdiccion, importeNetoLinea, jurisdiccionTexto, esJurisdUtilizacion, esJurisdOrigen, esJurisdEntrega, importeBrutoLinea, lineNumber, esJurisdFact, infoLineaActual, paramAplicaEnLaProvincia, paramAplicaFueraProvincia, paramNoAplicaProvincia, esJurisdEmpresa) {

	var proceso = 'agregarJurisdiccionesIIBB';
	var objInfo = '';

	try {
		
		nlapiLogExecution('DEBUG', 'L54 - Calculo Percepciones', 'INICIO - agregarJurisdiccionesIIBB');
        nlapiLogExecution('DEBUG', 'L54 - Calculo Percepciones', 'Parámetros - objPercepcion: ' + JSON.stringify(objPercepcion) + ', jurisdiccion: ' + jurisdiccion + ', importeNetoLinea: ' + importeNetoLinea +
            ' - jurisdiccionTexto: ' + jurisdiccionTexto + ' esJurisdUtilizacion: ' + esJurisdUtilizacion + ', esJurisdOrigen: ' + esJurisdOrigen + ', esJurisdEntrega: ' + esJurisdEntrega + 
            ', importeBrutoLinea: ' + importeBrutoLinea + ', esJurisdFact: ' + esJurisdFact + ', esJurisdEmpresa: ' + esJurisdEmpresa);

            var codigoEncontrado = false;
            var infoTerritorialidadLinea = {};

            // Segmento encargado de validar si la jurisdiccion de utilizacion aplica en la provincia, fuera de la provincia o no aplica en la provincia.
            if (!isEmpty(infoLineaActual) && !isEmpty(infoLineaActual.jurisdUtilizacion) && (jurisdiccion == infoLineaActual.jurisdUtilizacion)) {
                infoTerritorialidadLinea.critJurisdUtilizacion = paramAplicaEnLaProvincia;
            } else if (!isEmpty(infoLineaActual) && !isEmpty(infoLineaActual.jurisdUtilizacion) && (jurisdiccion != infoLineaActual.jurisdUtilizacion)) {
                infoTerritorialidadLinea.critJurisdUtilizacion = paramAplicaFueraProvincia;
            } else if (!isEmpty(infoLineaActual) && isEmpty(infoLineaActual.jurisdUtilizacion)) {
                infoTerritorialidadLinea.critJurisdUtilizacion = paramNoAplicaProvincia;
            }


            // Segmento encargado de validar si la jurisdiccion de origen aplica en la provincia, fuera de la provincia o no aplica en la provincia.
            if (!isEmpty(infoLineaActual) && !isEmpty(infoLineaActual.jurisdOrigen) && (jurisdiccion == infoLineaActual.jurisdOrigen)) {
                infoTerritorialidadLinea.critJurisdOrigen = paramAplicaEnLaProvincia;
            } else if (!isEmpty(infoLineaActual) && !isEmpty(infoLineaActual.jurisdOrigen) && (jurisdiccion != infoLineaActual.jurisdOrigen)) {
                infoTerritorialidadLinea.critJurisdOrigen = paramAplicaFueraProvincia;
            } else if (!isEmpty(infoLineaActual) && isEmpty(infoLineaActual.jurisdOrigen)) {
                infoTerritorialidadLinea.critJurisdOrigen = paramNoAplicaProvincia;
            }


            // Segmento encargado de validar si la jurisdiccion de destino/entrega aplica en la provincia, fuera de la provincia o no aplica en la provincia.
            if (!isEmpty(infoLineaActual) && !isEmpty(infoLineaActual.jurisdiccionEntrega) && (jurisdiccion == infoLineaActual.jurisdiccionEntrega)) {
                infoTerritorialidadLinea.critJurisdEntrega = paramAplicaEnLaProvincia;
            } else if (!isEmpty(infoLineaActual) && !isEmpty(infoLineaActual.jurisdiccionEntrega) && (jurisdiccion != infoLineaActual.jurisdiccionEntrega)) {
                infoTerritorialidadLinea.critJurisdEntrega = paramAplicaFueraProvincia;
            } else if (!isEmpty(infoLineaActual) && isEmpty(infoLineaActual.jurisdiccionEntrega)) {
                infoTerritorialidadLinea.critJurisdEntrega = paramNoAplicaProvincia;
            }


            // Segmento encargado de validar si la jurisdiccion de facturacion aplica en la provincia, fuera de la provincia o no aplica en la provincia.
            if (!isEmpty(infoLineaActual) && !isEmpty(infoLineaActual.jurisdFacturacion) && (jurisdiccion == infoLineaActual.jurisdFacturacion)) {
                infoTerritorialidadLinea.critJurisdFacturacion = paramAplicaEnLaProvincia;
            } else if (!isEmpty(infoLineaActual) && !isEmpty(infoLineaActual.jurisdFacturacion) && (jurisdiccion != infoLineaActual.jurisdFacturacion)) {
                infoTerritorialidadLinea.critJurisdFacturacion = paramAplicaFueraProvincia;
            } else if (!isEmpty(infoLineaActual) && isEmpty(infoLineaActual.jurisdFacturacion)) {
                infoTerritorialidadLinea.critJurisdFacturacion = paramNoAplicaProvincia;
            }


			// Segmento encargado de validar si la jurisdiccion de empresa aplica en la provincia, fuera de la provincia o no aplica en la provincia.
            if (!isEmpty(infoLineaActual) && !isEmpty(infoLineaActual.jurisdEmpresa) && (jurisdiccion == infoLineaActual.jurisdEmpresa)) {
                infoTerritorialidadLinea.critJurisdEmpresa = paramAplicaEnLaProvincia;
            } else if (!isEmpty(infoLineaActual) && !isEmpty(infoLineaActual.jurisdEmpresa) && (jurisdiccion != infoLineaActual.jurisdEmpresa)) {
                infoTerritorialidadLinea.critJurisdEmpresa = paramAplicaFueraProvincia;
            } else if (!isEmpty(infoLineaActual) && isEmpty(infoLineaActual.jurisdEmpresa)) {
                infoTerritorialidadLinea.critJurisdEmpresa = paramNoAplicaProvincia;
            }


            if (!isEmpty(objPercepcion)) {

                if (objPercepcion.length > 0) {
                    
                    // Busco si ya esta asociado el codigo de retencion
                    for (var i = 0; i < objPercepcion.length && codigoEncontrado == false; i++) {
                        if (objPercepcion[i].jurisdiccion == jurisdiccion && objPercepcion[i].critJurisdUtilizacion == infoTerritorialidadLinea.critJurisdUtilizacion &&
                            objPercepcion[i].critJurisdOrigen == infoTerritorialidadLinea.critJurisdOrigen && objPercepcion[i].critJurisdEntrega == infoTerritorialidadLinea.critJurisdEntrega &&
                            objPercepcion[i].critJurisdFacturacion == infoTerritorialidadLinea.critJurisdFacturacion && objPercepcion[i].critJurisdEmpresa == infoTerritorialidadLinea.critJurisdEmpresa) {

                            codigoEncontrado = true;
                            // Actualizo si son diferentes tipos de jurisdicciones y utilizaciones.
                            objPercepcion[i].esJurisdUtilizacion = (esJurisdUtilizacion) ? esJurisdUtilizacion : objPercepcion[i].esJurisdUtilizacion;
                            objPercepcion[i].esJurisdOrigen = (esJurisdOrigen) ? esJurisdOrigen : objPercepcion[i].esJurisdOrigen;
                            objPercepcion[i].esJurisdEntrega = (esJurisdEntrega) ? esJurisdEntrega : objPercepcion[i].esJurisdEntrega;
                            objPercepcion[i].esJurisdFact = (esJurisdFact) ? esJurisdFact : objPercepcion[i].esJurisdFact;
							objPercepcion[i].esJurisdEmpresa = (esJurisdEmpresa) ? esJurisdEmpresa : objPercepcion[i].esJurisdEmpresa;


                            if (objPercepcion[i].lineNumber != lineNumber) {
                                objPercepcion[i].lineNumber = lineNumber;
                                objPercepcion[i].importeNetoLinea += parseFloat(importeNetoLinea, 10);
                                objPercepcion[i].importeBrutoLinea += parseFloat(importeBrutoLinea, 10);
                                objPercepcion[i].importeNetoLinea = (parseFloat(countDecimales(objPercepcion[i].importeNetoLinea), 10) > 13) ? parseFloat(parseFloat(objPercepcion[i].importeNetoLinea, 10).toFixedOK(2), 10) : objPercepcion[i].importeNetoLinea;
                                objPercepcion[i].importeBrutoLinea = (parseFloat(countDecimales(objPercepcion[i].importeBrutoLinea), 10) > 13) ? parseFloat(parseFloat(objPercepcion[i].importeBrutoLinea, 10).toFixedOK(2), 10) : objPercepcion[i].importeBrutoLinea;
                            }
                        }
                    }
                }
            }
            
            
            var cantidadElementos = !isEmpty(objPercepcion) && objPercepcion.length > 0 ? objPercepcion.length : 0;


            if (!codigoEncontrado) {

                // Agrego el Codigo de la Retencion
                objPercepcion[cantidadElementos] = new Object();
				objPercepcion[cantidadElementos].idArticulo = infoLineaActual.idArticulo;
                objPercepcion[cantidadElementos].jurisdiccion = jurisdiccion;
                objPercepcion[cantidadElementos].importeNetoLinea = parseFloat(importeNetoLinea, 10);
                objPercepcion[cantidadElementos].lineNumber = lineNumber;
                objPercepcion[cantidadElementos].jurisdiccionTexto = jurisdiccionTexto;
                objPercepcion[cantidadElementos].esJurisdUtilizacion = esJurisdUtilizacion;
                objPercepcion[cantidadElementos].esJurisdOrigen = esJurisdOrigen;
                objPercepcion[cantidadElementos].esJurisdEntrega = esJurisdEntrega;
                objPercepcion[cantidadElementos].esJurisdFact = esJurisdFact;
				objPercepcion[cantidadElementos].esJurisdEmpresa = esJurisdEmpresa;
                objPercepcion[cantidadElementos].importeBrutoLinea = parseFloat(importeBrutoLinea, 10);
                objPercepcion[cantidadElementos].critJurisdUtilizacion = infoTerritorialidadLinea.critJurisdUtilizacion;
                objPercepcion[cantidadElementos].critJurisdOrigen = infoTerritorialidadLinea.critJurisdOrigen;
                objPercepcion[cantidadElementos].critJurisdEntrega = infoTerritorialidadLinea.critJurisdEntrega;
                objPercepcion[cantidadElementos].critJurisdFacturacion = infoTerritorialidadLinea.critJurisdFacturacion;
				objPercepcion[cantidadElementos].critJurisdEmpresa = infoTerritorialidadLinea.critJurisdEmpresa;

            }

            nlapiLogExecution('DEBUG', 'L54 - Calculo Percepciones', 'RETURN - objPercepcion: ' + JSON.stringify(objPercepcion));
            nlapiLogExecution('DEBUG', 'L54 - Calculo Percepciones', 'FIN - agregarJurisdiccionesIIBB');
            
            return objPercepcion;

	} catch (error) {
		nlapiLogExecution('ERROR', 'agregarJurisdiccionesIIBB', 'Error NetSuite Excepcion, detalles: ' + error.message);
	}

	return objInfo;
}

function obtenerJurisdiccionesEntrega(informacionArticulos, jurisdiccionNoPosee) {

	var proceso = 'obtenerJurisdiccionesEntrega';
	var jurisdiccionesEntrega = [];

	try {
		if (!isEmpty(informacionArticulos) && informacionArticulos.length > 0) {
			for (var i = 0; i < informacionArticulos.length; i++) {
				if (!isEmpty(informacionArticulos[i].jurisdiccionEntrega) && jurisdiccionNoPosee != informacionArticulos[i].jurisdiccionEntrega ) {

					jurisdiccionesEntrega.push(informacionArticulos[i].jurisdiccionEntrega);
				}
			}
		}
	} catch (error) {
		nlapiLogExecution("ERROR", proceso, 'Error NetSuite Excepcion - obtenerJurisdiccionesEntrega - detalles: ' + error.message);
	}

	return jurisdiccionesEntrega;
}

function obtenerJurisAcumuladas(informacionPercepciones) {

	var respuesta = { error: false, mensaje: '', jurisdAcumuladas: [] };
	nlapiLogExecution('DEBUG', 'obtenerJurisAcumuladas', 'INICIO - obtenerJurisAcumuladas - cantidad jurisdicciones: ' + informacionPercepciones.length);

	try {
		if (!isEmpty(informacionPercepciones) && informacionPercepciones.length > 0) {	
			for (var i = 0; i < informacionPercepciones.length; i++) {
				if (!isEmpty(informacionPercepciones[i].baseCalcAcumulada) && informacionPercepciones[i].baseCalcAcumulada) {
					respuesta.jurisdAcumuladas.push(informacionPercepciones[i].jurisdiccion);
				}
			}
		}
	} catch (error) {
		respuesta.error = true;
		respuesta.mensaje = 'Error excepcion al obtener la jurisdiccion acumulada del cliente - detalles: ' + error.message;
		nlapiLogExecution('ERROR', 'obtenerJurisAcumuladas', respuesta.mensaje);
	}

	nlapiLogExecution('DEBUG', 'obtenerJurisAcumuladas', 'FIN - obtenerJurisAcumuladas');

	return respuesta;
}

function obtenerImpNetoMens(entidad, periodo, subsidiaria, idTransaccion, jurisdiccionesLineas) {

	var respuesta = { error: false, mensaje: '', registros: [] };
	nlapiLogExecution('DEBUG', 'obtenerImpNetoMens', 'INICIO - obtenerImpNetoMens / entidad: ' + entidad + ' / periodo: ' + periodo + ' / idTransaccion: ' + idTransaccion + ' / jurisdiccionesLineas: ' + JSON.stringify(jurisdiccionesLineas));

	try {

			var filtros = [];
			var i = 0;
			var search = new nlapiLoadSearch('transaction', 'customsearch_l54_imp_neto_perio_calc_per');

			if (!isEmpty(entidad)) {
				filtros[i++] = new nlobjSearchFilter('entity', null, 'anyof', entidad);
			}
		
			if (!isEmpty(subsidiaria)) {
				filtros[i++] = new nlobjSearchFilter('subsidiary', null, 'anyof', subsidiaria);
			}

			if (!isEmpty(periodo)) {
				filtros[i++] = new nlobjSearchFilter('postingperiod', null, 'equalto', periodo);
			}

			if (!isEmpty(idTransaccion)) {
				filtros[i++] = new nlobjSearchFilter('internalid', null, 'noneof', idTransaccion);
			}

			if (!isEmpty(jurisdiccionesLineas)) {
				filtros[i++] = new nlobjSearchFilter('', null, 'anyof', jurisdiccionesLineas);
			}

			search.addFilters(filtros);
			var searchResults = search.runSearch();
			var columns = searchResults.getColumns();
			var resultsTrans = [];

			// resultIndex points to record starting current "resultado" in the entire results array
			var resultIndex = 0;
			var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
			var resultado; // temporary variable used to store the result set
			do {
				// fetch one result set
				resultado = searchResults.getResults(resultIndex, resultIndex + resultStep);

				if (!isEmpty(resultado) && resultado.length > 0)
				{
					if (resultIndex == 0)
						resultsTrans = resultado; //Primera ve inicializa
					else
						resultsTrans = resultsTrans.concat(resultado);
				}

				// increase pointer
				resultIndex = resultIndex + resultStep;

				// once no records are returned we already got all of them
			} while (!isEmpty(resultado) && resultado.length > 0)

			if (!isEmpty(resultsTrans) && resultsTrans.length > 0) {
				
				for (var i = 0; i < resultsTrans.length; i++) {
					var info = {};
					info.nombreCliente = resultsTrans[i].getValue(columns[0]);
					info.impNetoAcum = resultsTrans[i].getValue(columns[2]);
					info.jurisdiccion = resultsTrans[i].getValue(columns[3]);
					respuesta.registros.push(info);
				}
			} else {
				nlapiLogExecution('ERROR', 'obtenerImpNetoMens', 'No se encontró ningún resultado de transaccion para los filtros ingresados para obtener el neto acumulado mensual');
			}
	} catch (error) {
		respuesta.error = true;
		respuesta.mensaje = 'Error excepcion al obtener el importe neto acumulado de todas las transacciones del cliente - detalles: ' + error.message;
		nlapiLogExecution('ERROR', 'obtenerImpNetoMens', respuesta.mensaje);
	}

	nlapiLogExecution('DEBUG', 'obtenerImpNetoMens', 'FIN - obtenerImpNetoMens / respuesta: ' + JSON.stringify(respuesta));

	return respuesta;
}

function obtenerImpBrutoMens(entidad, periodo, subsidiaria, idTransaccion) {

	var respuesta = { error: false, mensaje: '', registros: [] };
	nlapiLogExecution('DEBUG', 'obtenerImpBrutoMens', 'INICIO - obtenerImpBrutoMens / entidad: ' + entidad + ' / periodo: ' + periodo + ' / idTransaccion: ' + idTransaccion);

	try {

			var filtros = [];
			var i = 0;
			var search = new nlapiLoadSearch('transaction', 'customsearch_l54_imp_brut_perio_calc_per');

			if (!isEmpty(entidad)) {
				filtros[i++] = new nlobjSearchFilter('entity', null, 'anyof', entidad);
			}
		
			if (!isEmpty(subsidiaria)) {
				filtros[i++] = new nlobjSearchFilter('subsidiary', null, 'anyof', subsidiaria);
			}

			if (!isEmpty(periodo)) {
				filtros[i++] = new nlobjSearchFilter('postingperiod', null, 'equalto', periodo);
			}

			if (!isEmpty(idTransaccion)) {
				filtros[i++] = new nlobjSearchFilter('internalid', null, 'noneof', idTransaccion);
			}

			search.addFilters(filtros);
			var searchResults = search.runSearch();
			var columns = searchResults.getColumns();
			var resultsTrans = [];

			// resultIndex points to record starting current "resultado" in the entire results array
			var resultIndex = 0;
			var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
			var resultado; // temporary variable used to store the result set
			do {
				// fetch one result set
				resultado = searchResults.getResults(resultIndex, resultIndex + resultStep);

				if (!isEmpty(resultado) && resultado.length > 0)
				{
					if (resultIndex == 0)
						resultsTrans = resultado; //Primera ve inicializa
					else
						resultsTrans = resultsTrans.concat(resultado);
				}

				// increase pointer
				resultIndex = resultIndex + resultStep;

				// once no records are returned we already got all of them
			} while (!isEmpty(resultado) && resultado.length > 0)

			if (!isEmpty(resultsTrans) && resultsTrans.length > 0) {
				var info = {};
				info.nombreCliente = resultsTrans[0].getValue(columns[0]);
				info.impBrutoAcum = resultsTrans[0].getValue(columns[2]);
				respuesta.registros.push(info);
			} else {
				nlapiLogExecution('ERROR', 'obtenerImpBrutoMens', 'No se encontró ningún resultado de transaccion para los filtros ingresados para obtener el bruto acumulado mensual');
			}
		
	} catch (error) {
		respuesta.error = true;
		respuesta.mensaje = 'Error excepcion al obtener el importe bruto acumulado de todas las transacciones del cliente - detalles: ' + error.message;
		nlapiLogExecution('ERROR', 'obtenerImpBrutoMens', respuesta.mensaje);
	}

	nlapiLogExecution('DEBUG', 'obtenerImpBrutoMens', 'FIN - obtenerImpBrutoMens / respuesta: ' + JSON.stringify(respuesta));

	return respuesta;
}

function obtenerAcumPorJurisdicciones(entidad, periodo, subsidiaria, jurisdicciones, tipoCambio, idTransaccion) {

	var proceso = 'obtenerAcumPorJurisdicciones';
	var respuesta = { error: false, mensaje: '', registros: [] };
	var arrayAux = [];
	nlapiLogExecution('DEBUG', proceso, 'INICIO - obtenerAcumPorJurisdicciones / entidad: ' + entidad + ' / periodo: ' + periodo + ' / subsidiaria: ' + subsidiaria + ' / jurisdicciones: ' + JSON.stringify(jurisdicciones));

	try {
		/* Filtros */
		var filtros = [];
		var i = 0;
		var search = new nlapiLoadSearch('customrecord_l54_acumulados_percepciones', 'customsearch_l54_acumad_por_percepciones');

		if (!isEmpty(entidad)) {
			filtros[i++] = new nlobjSearchFilter('custrecord_l54_acum_perc_cliente', null, 'anyof', entidad);
		}
	
		if (!isEmpty(subsidiaria)) {
			filtros[i++] = new nlobjSearchFilter('custrecord_l54_acum_perc_subsidiaria', null, 'anyof', subsidiaria);
		}

		if (!isEmpty(periodo)) {
			filtros[i++] = new nlobjSearchFilter('custrecord_l54_acum_perc_periodo', null, 'is', periodo);
		}

		if (!isEmpty(idTransaccion)) {
			filtros[i++] = new nlobjSearchFilter('custrecord_l54_acum_perc_trans_asoc', null, 'noneof', idTransaccion);
		}

		if (!isEmpty(jurisdicciones) && jurisdicciones.length > 0) {
			filtros[i++] = new nlobjSearchFilter('custrecord_l54_acum_perc_jurisdiccion', null, 'anyof', jurisdicciones);
		}

		filtros[i++] = new nlobjSearchFilter('custrecord_l54_acum_perc_anulado', null, 'is', 'F');

		search.addFilters(filtros);
		var searchResults = search.runSearch();
		var columns = searchResults.getColumns();
		var resultsTrans = [];

		// resultIndex points to record starting current "resultado" in the entire results array
		var resultIndex = 0;
		var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
		var resultado; // temporary variable used to store the result set
		do {
			// fetch one result set
			resultado = searchResults.getResults(resultIndex, resultIndex + resultStep);

			if (!isEmpty(resultado) && resultado.length > 0)
			{
				if (resultIndex == 0)
					resultsTrans = resultado; //Primera ve inicializa
				else
					resultsTrans = resultsTrans.concat(resultado);
			}

			// increase pointer
			resultIndex = resultIndex + resultStep;

			// once no records are returned we already got all of them
		} while (!isEmpty(resultado) && resultado.length > 0)

		if (!isEmpty(resultsTrans) && resultsTrans.length > 0) {
			for (var i = 0; i < resultsTrans.length; i++) {
				
				var objInfo = {};
				objInfo.idInterno = resultsTrans[i].getValue(columns[0]);
				objInfo.jurisdiccion = resultsTrans[i].getValue(columns[1]);
				objInfo.impBaseCalculoAcumulada = parseFloat(resultsTrans[i].getValue(columns[4]), 10);
				objInfo.tipoCambio = parseFloat(resultsTrans[i].getValue(columns[5]), 10);

				// Si la transaccion esta en USD o moneda diferente a peso Argentino
				objInfo.impBaseCalculoAcumulada = (!isEmpty(objInfo.tipoCambio) && parseFloat(objInfo.tipoCambio, 10) > 1 && parseFloat(tipoCambio, 10) > 1) ? parseFloat(objInfo.impBaseCalculoAcumulada * tipoCambio, 10) : parseFloat(objInfo.impBaseCalculoAcumulada * objInfo.tipoCambio, 10);
				
				respuesta.registros.push(objInfo);
			}
		} else {
			nlapiLogExecution('ERROR', proceso, 'No se encontró ningún resultado de transaccion para los filtros ingresados para obtener el acumulado de transacciones mensuales');
		}
	} catch (error) {
		respuesta.error = true;
		respuesta.mensaje = 'Error excepcion al obtener todos los acumulados del cliente pagados en el periodo del pago actual - detalles: ' + error.message;
		nlapiLogExecution('ERROR', proceso, respuesta.mensaje);
	}

	nlapiLogExecution('DEBUG', proceso, 'FIN - obtenerAcumPorJurisdicciones / respuesta: ' + JSON.stringify(respuesta));

	return respuesta;
}

function obtenerTransConPercep(entidad, periodo, subsidiaria, jurisdAcumuladas, idTransaccion) {

	var respuesta = { error: false, mensaje: '', registros: [], existenPercParaTodasJurisd: false };
	nlapiLogExecution('DEBUG', 'obtenerTransConPercep', 'INICIO - obtenerTransConPercep / entidad: ' + entidad + ' / periodo: ' + periodo + ' / jurisdAcumuladas: ' + JSON.stringify(jurisdAcumuladas) + ' / idTransaccion: ' + idTransaccion);

	try {
		if (!isEmpty(jurisdAcumuladas) && jurisdAcumuladas.length > 0) {
			var filtros = [];
			var i = 0;
			var search = new nlapiLoadSearch('transaction', 'customsearch_l54_transac_perc_mensuales');

			if (!isEmpty(entidad)) {
				filtros[i++] = new nlobjSearchFilter('entity', null, 'anyof', entidad);
			}
		
			if (!isEmpty(subsidiaria)) {
				filtros[i++] = new nlobjSearchFilter('subsidiary', null, 'anyof', subsidiaria);
			}

			if (!isEmpty(periodo)) {
				filtros[i++] = new nlobjSearchFilter('postingperiod', null, 'equalto', periodo);
			}

			if (!isEmpty(jurisdAcumuladas) && jurisdAcumuladas.length > 0) {
				filtros[i++] = new nlobjSearchFilter('custcol_l54_jurisd_iibb_lineas', null, 'anyof', jurisdAcumuladas);
			}

			if (!isEmpty(idTransaccion)) {
				filtros[i++] = new nlobjSearchFilter('internalid', null, 'noneof', idTransaccion);
			}

			search.addFilters(filtros);
			var searchResults = search.runSearch();
			var columns = searchResults.getColumns();
			var resultsTrans = [];

			// resultIndex points to record starting current "resultado" in the entire results array
			var resultIndex = 0;
			var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
			var resultado; // temporary variable used to store the result set
			do {
				// fetch one result set
				resultado = searchResults.getResults(resultIndex, resultIndex + resultStep);

				if (!isEmpty(resultado) && resultado.length > 0)
				{
					if (resultIndex == 0)
						resultsTrans = resultado; //Primera ve inicializa
					else
						resultsTrans = resultsTrans.concat(resultado);
				}

				// increase pointer
				resultIndex = resultIndex + resultStep;

				// once no records are returned we already got all of them
			} while (!isEmpty(resultado) && resultado.length > 0)

			if (!isEmpty(resultsTrans) && resultsTrans.length > 0) {
				for (var i = 0; i < resultsTrans.length; i++) {
					var info = {};
					info.nombreCliente = resultsTrans[i].getValue(columns[0]);
					info.jurisdiccion = resultsTrans[i].getValue(columns[1]);
					info.impBrutoAcum = resultsTrans[i].getValue(columns[2]);
					respuesta.registros.push(info);
				}

				var existenPercParaTodasJurisd = true;
                for (var i = 0; !isEmpty(jurisdAcumuladas) && i < jurisdAcumuladas.length && existenPercParaTodasJurisd; i++) {
                    var result = respuesta.registros.filter(function (obj) {
                        return (obj.jurisdiccion == jurisdAcumuladas[i])
                    });
                    existenPercParaTodasJurisd = (!isEmpty(result) && result.length > 0) ? true : false;
                }

                respuesta.existenPercParaTodasJurisd = existenPercParaTodasJurisd;
			} else {
				nlapiLogExecution('ERROR', 'obtenerTransConPercep', 'No se encontró ningún resultado de transaccion para los filtros ingresados para obtener percepciones por jurisdiccion');
			}
		}
	} catch (error) {
		respuesta.error = true;
		respuesta.mensaje = 'Error excepcion al obtener percepciones por jurisdicciones de todas las transacciones del cliente - detalles: ' + error.message;
		nlapiLogExecution('ERROR', 'obtenerTransConPercep', respuesta.mensaje);
	}

	nlapiLogExecution('DEBUG', 'obtenerTransConPercep', 'FIN - obtenerTransConPercep / respuesta: ' + JSON.stringify(respuesta));

	return respuesta;
}

function validarPercJurisdiccion(arrayTransacciones, jurisdiccion) {

	var respuesta = { error: false, mensaje: '', existenPercepciones: false };
	nlapiLogExecution('DEBUG', 'validarPercJurisdiccion', 'INICIO - validarPercJurisdiccion');

	try {
		if (arrayTransacciones.length > 0) {
			var result = arrayTransacciones.filter(function (obj) {
				return (obj.jurisdiccion === jurisdiccion)
			});

			if (result.length > 0) {
				respuesta.existenPercepciones = true;
			}
		}
	} catch (error) {
		respuesta.error = true;
		respuesta.mensaje = 'Error excepcion al validar si existe transacciones con percepciones a procesar - detalles: ' + error.message
		nlapiLogExecution('ERROR', 'validarPercJurisdiccion', respuesta.mensaje);
	}

	nlapiLogExecution('DEBUG', 'validarPercJurisdiccion', 'FIN - validarPercJurisdiccion / respuesta: ' + JSON.stringify(respuesta));

	return respuesta;
}

function obtenerImpAcumMens(arrayPerAcumuladas, jurisdiccion) {

	var respuesta = { error: false, mensaje: '', registro: [] };
	nlapiLogExecution('DEBUG', 'obtenerImpAcumMens', 'INICIO - obtenerImpAcumMens');

	try {
		if (!isEmpty(arrayPerAcumuladas) && arrayPerAcumuladas.length > 0) {
			var result = arrayPerAcumuladas.filter(function (obj) {
				return (obj.jurisdiccion === jurisdiccion)
			});

			if (!isEmpty(result) && result.length > 0) {
				
				var objInfo = {};
				objInfo.jurisdiccion = result[0].jurisdiccion;
				objInfo.impBaseCalculoAcumulada = 0;

				for (var i = 0; i < result.length; i++) {
					objInfo.impBaseCalculoAcumulada += parseFloat(result[i].impBaseCalculoAcumulada, 10);
				}

				respuesta.registro.push(objInfo);
			}
		}
	} catch (error) {
		respuesta.error = true;
		respuesta.mensaje = 'Error excepcion al obtener el importe acumulado mensual - detalles: ' + error.message
		nlapiLogExecution('ERROR', 'obtenerImpAcumMens', respuesta.mensaje);
	}

	nlapiLogExecution('DEBUG', 'obtenerImpAcumMens', 'FIN - obtenerImpAcumMens / respuesta: ' + JSON.stringify(respuesta));

	return respuesta;
}

function actualizar_jur_cliente(cliente, alicuota_percepcion, impuestoARBA) {

	// Si no tenÃ­a nada especificado el cliente en BS AS (no hay registro en JUR/CLI, tenes que crearle el registro nuevo y mandarle el cÃ³digo de impuesto que le corresponde.
	// Si tenÃ­a creado un registro y tenÃ­a otro cÃ³digo de impuestos asociado, vos tenes que cambiar el cÃ³digo de impuestos por el correcto
	// Si el cliente tiene CERO en ARBA (BAJA) vos tenes que dejarle ALICUOTA GENERAL (lo tenes en el fichero de config general)
	// Si no tenes el codigo de impuesto correcto tenes que marcar con error el registro de la base para que sepan que registro de impuestos deben crear

	recConfGeneral = obtener_pv_iibb_conf_general();

	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	new nlobjSearchFilter('custrecord_l54_pv_jc_cliente', null, 'is', cliente),
	new nlobjSearchFilter('custrecord_l54_pv_jc_jurisdiccion', null, 'is', recConfGeneral.getValue('custrecord_l54_pv_gral_jur_arba'))];

	var columns = [new nlobjSearchColumn('custrecord_l54_pv_jc_cliente'),
	new nlobjSearchColumn('custrecord_l54_pv_jc_jurisdiccion'),
	new nlobjSearchColumn('custrecord_l54_pv_jc_codigo_impuesto')];

	var results = nlapiSearchRecord('customrecord_l54_pv_iibb_jur_cliente', null, filters, columns);

	// hay un registro
	if (results != null && results.length > 0) {

		if (alicuota_percepcion == 0) {

			nlapiDeleteRecord('customrecord_l54_pv_iibb_jur_cliente', results[0].getId());
		} else if (results[0].getValue('custrecord_l54_pv_jc_codigo_impuesto') != impuestoARBA['codigo_impuesto'] && !isEmpty(impuestoARBA['codigo_impuesto'])) {

			var updateRecord = nlapiLoadRecord('customrecord_l54_pv_iibb_jur_cliente', results[0].getId());
			updateRecord.setFieldValue('custrecord_l54_pv_jc_codigo_impuesto', impuestoARBA['codigo_impuesto']);
			nlapiSubmitRecord(updateRecord);
		}
	}
	// no hay registros
	else if (alicuota_percepcion != 0 && !isEmpty(impuestoARBA['codigo_impuesto'])) {

		var newRecord = nlapiCreateRecord('customrecord_l54_pv_iibb_jur_cliente');
		newRecord.setFieldValue('custrecord_l54_pv_jc_cliente', cliente);
		newRecord.setFieldValue('custrecord_l54_pv_jc_jurisdiccion', recConfGeneral.getValue('custrecord_l54_pv_gral_jur_arba'));
		newRecord.setFieldValue('custrecord_l54_pv_jc_codigo_impuesto', impuestoARBA['codigo_impuesto']);
		newRecord.setFieldValue('custrecord_l54_pv_jc_estado', 3); // Listado de Tipo contrib. IIBB: Local
		nlapiSubmitRecord(newRecord);
	}
}

// Función que sirve para retornar cuantos decimales posee un número
function countDecimales(number) {

	var cantidadDecimales = 0;

	if (!isEmpty(number)) {
		var arrayNumber = parseFloat(number, 10).toString().split('.');
		cantidadDecimales = (arrayNumber.length == 2) ? arrayNumber[1].length : 0;
	}

	return cantidadDecimales;
}

// Función que sirve para eliminar el separador decimal y transformar un número en entero.
function convertToInteger(number) {

	var numberConvert = 0.0;

	if (!isEmpty(number))
		numberConvert = parseFloat(number, 10).toString().replace('.', '');

	return parseFloat(numberConvert, 10);
}

function vericar_padron_ARBA() {

	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	new nlobjSearchFilter('custrecord_l54_pv_pa_procesado', null, 'is', 'F')];

	var columns = [new nlobjSearchColumn('custrecord_l54_pv_pa_cliente'),
	new nlobjSearchColumn('custrecord_l54_pv_pa_cuit_cliente'),
	new nlobjSearchColumn('custrecord_l54_pv_pa_alic_percep'),
	new nlobjSearchColumn('custrecord_l54_pv_pa_alic_retenc')];

	var results = nlapiSearchRecord('customrecord_l54_pv_iibb_arba', null, filters, columns);

	for (var i = 0; results != null && i < results.length; i++) {

		var recImpuestoARBA = impuesto_ARBA(results[i].getValue('custrecord_l54_pv_pa_alic_percep'));

		var recId = results[i].getId();
		var record = nlapiLoadRecord('customrecord_l54_pv_iibb_arba', recId);

		if (Object.keys(recImpuestoARBA).length == 0 && results[i].getValue('custrecord_l54_pv_pa_alic_percep') != 0) {

			record.setFieldValue('custrecord_l54_pv_pa_error', 'T');
		} else {

			record.setFieldValue('custrecord_l54_pv_pa_procesado', 'T');
			record.setFieldValue('custrecord_l54_pv_pa_error', 'F');

			actualizar_jur_cliente(results[i].getValue('custrecord_l54_pv_pa_cliente'), results[i].getValue('custrecord_l54_pv_pa_alic_percep'), recImpuestoARBA);
		}

		try {
			var id = nlapiSubmitRecord(record);
			nlapiLogExecution('DEBUG', 'Proceso de verificaciÃ³n de PadrÃ³n ARBA. Se actualizaron los datos de validaciÃ³n/procesamiento exitosamente');
		} catch (e) {
			nlapiLogExecution('ERROR', 'Proceso de verificaciÃ³n de PadrÃ³n ARBA. Se produjo un error actualizando los datos de validaciÃ³n/procesamiento.', 'NetSuite dice: ' + e.message);
		}
	}

	alert('Proceso de verificaciÃ³n de PadrÃ³n ARBA finalizo correctamente.');
}

// Método que me devuelve por cada Jurisdiccion de IIBB las jurisdicciones a las cuales el Cliente esta Inscripto y el estado de Inscripcion
function getClienteInscriptoRegimenIIBB(id_cliente, idEstadoExento, jurisdiccionesIIBB, idTipoContribIIBBDefault, idTipoContribIIBBDefaultText, coeficienteBaseImponible, jurisdiccionesObligatorias, trandate, jurisdiccionesEntregaFacturas) {
	nlapiLogExecution('DEBUG', 'getClienteInscriptoRegimenIIBB', 'INICIO - getClienteInscriptoRegimenIIBB - jurisdiccionesEntregaFacturas: ' + JSON.stringify(jurisdiccionesEntregaFacturas) + ' - jurisdiccionesObligatorias: ' + JSON.stringify(jurisdiccionesObligatorias) + ' - trandate: ' + trandate);
	var jurisdiccionesAux = new Array();
	var estadoInscripcionCliente = new Object();
	estadoInscripcionCliente.iibb = false;
	estadoInscripcionCliente.jurisdicciones = new Array();
	estadoInscripcionCliente.warning = false;
	estadoInscripcionCliente.mensajeWarning = "";
	var indiceJurisdicciones = 0;
	var avisoCertificadoExencionVencido = false;
	var jurisdiccionesCertfVencido = "";
	var jurisdiccionesCliente = [];

	var jurisdiccionesAgenteRecaudacion = new Array();

	// var today = new Date();
	if (jurisdiccionesIIBB != null && jurisdiccionesIIBB.length > 0 && id_cliente != null) {

		var filtroJurisdiccionCli = new Array();
		/*filtroJurisdiccionCli[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filtroJurisdiccionCli[1] = new nlobjSearchFilter('custrecord_l54_pv_jc_cliente', null, 'is', id_cliente);
		filtroJurisdiccionCli[2] = new nlobjSearchFilter('custrecord_l54_pv_jc_jurisdiccion', null, 'anyof', jurisdiccionesIIBB);*/
		filtroJurisdiccionCli[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filtroJurisdiccionCli[1] = new nlobjSearchFilter('custrecord_l54_jurisdicciones_iibb_cli', null, 'is', id_cliente);
		filtroJurisdiccionCli[2] = new nlobjSearchFilter('custrecord_l54_jurisdicciones_iibb_jur', null, 'anyof', jurisdiccionesIIBB);
        filtroJurisdiccionCli[3] = new nlobjSearchFilter('custrecord_l54_calcula_percepcion', 'custrecord_l54_jurisdicciones_iibb_tipo', 'is', 'T');
		var columnasJurisdiccionCli = new Array();
		/*columnasJurisdiccionCli[0] = new nlobjSearchColumn('custrecord_l54_pv_jc_jurisdiccion');
		columnasJurisdiccionCli[1] = new nlobjSearchColumn('custrecord_l54_pv_jc_estado');
		columnasJurisdiccionCli[2] = new nlobjSearchColumn('custrecord_l54_pv_jc_fecvento');*/
		columnasJurisdiccionCli[0] = new nlobjSearchColumn('custrecord_l54_jurisdicciones_iibb_jur');
		columnasJurisdiccionCli[1] = new nlobjSearchColumn('custrecord_l54_jurisdicciones_iibb_tipo');
		columnasJurisdiccionCli[2] = new nlobjSearchColumn('custrecord_l54_jurisdicciones_iibb_caduc');
		columnasJurisdiccionCli[3] = new nlobjSearchColumn('custrecord_l54_tipo_contr_iibb_es_agente', 'custrecord_l54_jurisdicciones_iibb_tipo');
		columnasJurisdiccionCli[4] = new nlobjSearchColumn('custrecord_l54_jurisdicciones_iibb_coefi');
		columnasJurisdiccionCli[5] = new nlobjSearchColumn('custrecord_l54_zona_impuestos_codigo', 'custrecord_l54_jurisdicciones_iibb_jur');
		columnasJurisdiccionCli[6] = new nlobjSearchColumn('custrecord_l54_jurisdicciones_iibb_jur_s');
		columnasJurisdiccionCli[7] = new nlobjSearchColumn('custrecord_l54_zona_imp_cal_per_jur_insc', 'custrecord_l54_jurisdicciones_iibb_jur');



		//var resultadosJurisdiccionCli = new nlapiSearchRecord("customrecord_l54_pv_iibb_jur_cliente", null, filtroJurisdiccionCli, columnasJurisdiccionCli);
		var resultadosJurisdiccionCli = new nlapiSearchRecord("customrecord_l54_jurisdicciones_iibb", null, filtroJurisdiccionCli, columnasJurisdiccionCli);

		for (var i = 0; resultadosJurisdiccionCli != null && i < resultadosJurisdiccionCli.length; i++) {

			var jurisdiccion = resultadosJurisdiccionCli[i].getValue('custrecord_l54_jurisdicciones_iibb_jur');
			var jurisdiccionTexto = resultadosJurisdiccionCli[i].getText('custrecord_l54_jurisdicciones_iibb_jur');
			var estado_regimen = resultadosJurisdiccionCli[i].getValue('custrecord_l54_jurisdicciones_iibb_tipo');
			var estado_regimen_texto = resultadosJurisdiccionCli[i].getText('custrecord_l54_jurisdicciones_iibb_tipo');
			var fecha_caducidad = resultadosJurisdiccionCli[i].getValue('custrecord_l54_jurisdicciones_iibb_caduc');
			var coeficiente_base_imponible = resultadosJurisdiccionCli[i].getValue('custrecord_l54_jurisdicciones_iibb_coefi');
			var esAgenteRetencion = resultadosJurisdiccionCli[i].getValue('custrecord_l54_tipo_contr_iibb_es_agente', 'custrecord_l54_jurisdicciones_iibb_tipo');
			var jurisdiccionCodigo = resultadosJurisdiccionCli[i].getValue('custrecord_l54_zona_impuestos_codigo', 'custrecord_l54_jurisdicciones_iibb_jur');
			var jurisdiccionSede = convertToBoolean(resultadosJurisdiccionCli[i].getValue('custrecord_l54_jurisdicciones_iibb_jur_s'));
			var aplicaCalcPercPorInscrip = convertToBoolean(resultadosJurisdiccionCli[i].getValue('custrecord_l54_zona_imp_cal_per_jur_insc', 'custrecord_l54_jurisdicciones_iibb_jur'));
			var infoJurisdiccion = {};
			infoJurisdiccion.calcPerc = false;
			infoJurisdiccion.idInterno = jurisdiccion;

			// No Considerar percepciones A Otros Agentes de Retencion
			if (esAgenteRetencion != 'T') {
				if (estado_regimen != idEstadoExento) {

					nlapiLogExecution('AUDIT', 'getClienteInscriptoRegimenIIBB', 'line 1128 - fecha_caducidad: ' + fecha_caducidad + ' - nlapiStringToDate(fecha_caducidad): ' + nlapiStringToDate(fecha_caducidad) + ' - trandate: ' + trandate + ' - typeof trandate: ' + typeof trandate);

					if (isEmpty(fecha_caducidad) || (!isEmpty(fecha_caducidad) && nlapiStringToDate(fecha_caducidad) < trandate)) {
						if ((!isEmpty(fecha_caducidad) && nlapiStringToDate(fecha_caducidad) < trandate)) {
							avisoCertificadoExencionVencido = true;
							//nlapiLogExecution('AUDIT', 'getClienteInscriptoRegimenIIBB', 'Ingreso a certificado de exención vencida: ' + avisoCertificadoExencionVencido + ' - jurisdiccionesCertfVencido: ' + jurisdiccionesCertfVencido);

							if (isEmpty(jurisdiccionesCertfVencido)) {
								jurisdiccionesCertfVencido = jurisdiccionTexto;
							} else {
								jurisdiccionesCertfVencido = jurisdiccionesCertfVencido + ", " + jurisdiccionTexto;
							}
						}

						if (jurisdiccionesAux.indexOf(jurisdiccion) == -1) {
							estadoInscripcionCliente.iibb = true;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones] = new Object();
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].noCumpleMinimo = false;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccion = jurisdiccion;
							jurisdiccionesAux[indiceJurisdicciones] = jurisdiccion;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccionTexto = jurisdiccionTexto;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].tipoContribuyente = !isEmpty(estado_regimen) ? estado_regimen : idTipoContribIIBBDefault;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].tipoContribuyenteTexto = !isEmpty(estado_regimen_texto) ? estado_regimen_texto : idTipoContribIIBBDefaultText;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].coeficienteBaseImponible = coeficiente_base_imponible;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccionCodigo = jurisdiccionCodigo;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].esPercPadron = false;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccionSede = jurisdiccionSede;
                            estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].esJurisdEntrega = false;
                            estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].aplicaCalcPercPorInscrip = aplicaCalcPercPorInscrip;
							indiceJurisdicciones = parseInt(indiceJurisdicciones, 10) + parseInt(1, 10);

							infoJurisdiccion.calcPerc = true;
						}
					}
				}
			} else {
				jurisdiccionesAgenteRecaudacion.push(jurisdiccion);
			}

			jurisdiccionesCliente.push(infoJurisdiccion);
		}

		// Aviso de los Certificados Vencidos
		if (avisoCertificadoExencionVencido == true) {
			//alert('Aviso: las percepciones para las Jurisdicciones : ' + jurisdiccionesCertfVencido + ' serÃ¡n calculadas, debido a que los certificados de exenciÃ³n de IIBB se encuentran vencidos.');
			estadoInscripcionCliente.warning = true;
			estadoInscripcionCliente.mensajeWarning = 'Las percepciones para las Jurisdicciones: ' + jurisdiccionesCertfVencido + ' serán calculadas, debido a que los certificados de exención de IIBB se encuentran vencidos.';
		}

		nlapiLogExecution('DEBUG', 'getClienteInscriptoRegimenIIBB', 'jurisdiccionesCliente: ' + JSON.stringify(jurisdiccionesCliente));


		// INICIO - Inserción de jurisdicción en campo L54 - Jurisdiccion Entrega
		if (!isEmpty(jurisdiccionesEntregaFacturas) && jurisdiccionesEntregaFacturas.length > 0) {

			for (var i = 0; i < jurisdiccionesEntregaFacturas.length; i++) {

				var jurisdiccionDireccionEntrega = jurisdiccionesEntregaFacturas[i].internalid;
				var jurisdiccionDireccionEntregaText = jurisdiccionesEntregaFacturas[i].jurisdiccionDireccionEntregaText;
				var jurisdiccionEntregaCodigoDireccionEntrega = jurisdiccionesEntregaFacturas[i].codigoJurisdiccion;
				var calcPerNoInscJurEnt = jurisdiccionesEntregaFacturas[i].calcPerNoInscJurEnt;
				var aplicaCalcPercPorInscrip = jurisdiccionesEntregaFacturas[i].aplicaCalcPercPorInscrip;
				//nlapiLogExecution('DEBUG', 'Proceso Calculo de Percepciones. Jurisdiccion de Entrega : ' + jurisdiccionEntrega);

				// Si la Jurisdiccion de Entrega es de un Agente de Recaudacion no conisderar
				if (jurisdiccionesAgenteRecaudacion.length == 0 || jurisdiccionesAgenteRecaudacion.indexOf(jurisdiccionDireccionEntrega) == -1) {

					var detJurCliente = jurisdiccionesCliente.filter(function (obj) {
						return (obj.idInterno == jurisdiccionDireccionEntrega)
					});

					var calcPerc = false;

					// Si la jurisdiccion esta en las del cliente se debe validar si esta exento, agente de percepcion, si se calcula percepcion
					if (!isEmpty(detJurCliente) && detJurCliente.length > 0) {
						calcPerc = detJurCliente[0].calcPerc;
					} else if (calcPerNoInscJurEnt) {
						calcPerc = true;
					}


					if ((jurisdiccionesAux.length == 0 || jurisdiccionesAux.indexOf(jurisdiccionDireccionEntrega) == -1) && calcPerc) {
						// Verifico que la Jurisdiccion de la Direccion de Entrega sea una jurisdiccion de la Empresa
						//nlapiLogExecution('DEBUG', 'Proceso Calculo de Percepciones. Jurisdicciones Empresa : ' + jurisdiccionesIIBB.toString());
						if (jurisdiccionesIIBB.indexOf(jurisdiccionDireccionEntrega) >= 0) {
							// Agrego la Jurisdiccion de la Direccion de Entrega
							estadoInscripcionCliente.iibb = true;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones] = new Object();
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].noCumpleMinimo = false;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccion = jurisdiccionDireccionEntrega;
							jurisdiccionesAux[indiceJurisdicciones] = jurisdiccionDireccionEntrega;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccionTexto = jurisdiccionDireccionEntregaText;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].tipoContribuyente = idTipoContribIIBBDefault;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].tipoContribuyenteTexto = idTipoContribIIBBDefaultText;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].coeficienteBaseImponible = coeficienteBaseImponible;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccionCodigo = jurisdiccionEntregaCodigoDireccionEntrega;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].esPercPadron = false;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccionSede = false;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].esJurisdEntrega = true;
							estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].aplicaCalcPercPorInscrip = aplicaCalcPercPorInscrip;
							indiceJurisdicciones = parseInt(indiceJurisdicciones, 10) + parseInt(1, 10);
							// Mostrar Mensaje de que se va a configurar el Tipo de Contribuyente de IIBB por Defecto
							estadoInscripcionCliente.warning = true;
							estadoInscripcionCliente.mensajeWarning = estadoInscripcionCliente.mensajeWarning + ' La Jurisdicción: ' + jurisdiccionDireccionEntregaText + ' configurada en la dirección de entrega, no se encuentra configurada para el cliente, se asignará el Tipo de Contribuyente: ' + idTipoContribIIBBDefaultText + ' a la línea de Percepción. \n';
						} else {
							// Mostrar Mensaje de que la JurisdicciÃ³n de Entrega no esta Incluida entre las Jurisdicciones de la Empresa
							estadoInscripcionCliente.warning = true;
							estadoInscripcionCliente.mensajeWarning = estadoInscripcionCliente.mensajeWarning + ' La percepción para la Jurisdicción de la Dirección de Entrega: ' + jurisdiccionDireccionEntregaText + ' no será calculada, debido a que la empresa no es Agente de Percepción en la Jurisdicción. \n';
						}
					}
				}
			}

		}
		// FIN - Inserción de jurisdicción en campo L54 - Jurisdiccion Entrega

		// INICIO - Inserción de Jurisdicciones CFE, BUE y TUCUMAN segun el tilde de configuracion general
		if (!isEmpty(jurisdiccionesObligatorias) && jurisdiccionesObligatorias.length > 0) {
			for (var i = 0; i < jurisdiccionesObligatorias.length; i++) {

				var jurisdiccionObligatoria = jurisdiccionesObligatorias[i].internalid;
				var jurisdiccionObligatoriaName = jurisdiccionesObligatorias[i].name;
				var jurisdiccionObligatoriaCodigo = jurisdiccionesObligatorias[i].codigoJurisdiccion;
				var esPercPadron = jurisdiccionesObligatorias[i].esPercPadron;
				var aplicaCalcPercPorInscrip = jurisdiccionesObligatorias[i].aplicaCalcPercPorInscrip;


				//nlapiLogExecution('DEBUG', 'Proceso Calculo de Percepciones. Jurisdiccion de Entrega : ' + jurisdiccionEntrega);
				if (!isEmpty(jurisdiccionObligatoria)) {
					// Si la Jurisdiccion de Entrega es de un Agente de Recaudacion no conisderar
					if (jurisdiccionesAgenteRecaudacion.length == 0 || jurisdiccionesAgenteRecaudacion.indexOf(jurisdiccionObligatoria) == -1) {
						if (jurisdiccionesAux.length == 0 || jurisdiccionesAux.indexOf(jurisdiccionObligatoria) == -1) {
							// Verifico que la Jurisdiccion de la Direccion de Entrega sea una jurisdiccion de la Empresa
							//nlapiLogExecution('DEBUG', 'Proceso Calculo de Percepciones. Jurisdicciones Empresa : ' + jurisdiccionesIIBB.toString());
							if (jurisdiccionesIIBB.indexOf(jurisdiccionObligatoria) >= 0) {
								// Agrego la Jurisdiccion de la Direccion de Entrega
								estadoInscripcionCliente.iibb = true;
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones] = new Object();
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].noCumpleMinimo = false;
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccion = jurisdiccionObligatoria;
								jurisdiccionesAux[indiceJurisdicciones] = jurisdiccionObligatoria;
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccionTexto = jurisdiccionObligatoriaName;
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].tipoContribuyente = idTipoContribIIBBDefault;
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].tipoContribuyenteTexto = idTipoContribIIBBDefaultText;
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].coeficienteBaseImponible = coeficienteBaseImponible;
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccionCodigo = jurisdiccionObligatoriaCodigo;
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].esPercPadron = esPercPadron;
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].jurisdiccionSede = false;
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].esJurisdEntrega = false;
								estadoInscripcionCliente.jurisdicciones[indiceJurisdicciones].aplicaCalcPercPorInscrip = aplicaCalcPercPorInscrip;
								indiceJurisdicciones = parseInt(indiceJurisdicciones, 10) + parseInt(1, 10);
								// Mostrar Mensaje de que se va a configurar el Tipo de Contribuyente de IIBB por Defecto
								estadoInscripcionCliente.warning = true;
								estadoInscripcionCliente.mensajeWarning = estadoInscripcionCliente.mensajeWarning + ' La Jurisdiccion: ' + jurisdiccionObligatoriaName + ' está configurada para calcular sólo por configuración de Padrón, se evaluará si existe el padrón para la misma; la jurisdicción no se encuentra configurada para el cliente y se asignará el Tipo de Contribuyente: ' + idTipoContribIIBBDefaultText + ' a la linea de Percepcion. \n';
							} else {
								// Mostrar Mensaje de que la JurisdicciÃ³n de Entrega no esta Incluida entre las Jurisdicciones de la Empresa
								estadoInscripcionCliente.warning = true;
								estadoInscripcionCliente.mensajeWarning = estadoInscripcionCliente.mensajeWarning + ' La percepción para la Jurisdicción: ' + jurisdiccionObligatoriaName + ' (configurada para calcular sólo por configuración de Padrón) no será calculada, debido a que la empresa no es Agente de Percepcion en la Jurisdicción. \n';
							}
						}
					}
				}
			}
		}
		// FIN - Inserción de Jurisdicciones CFE, BUE y TUCUMAN segun el tilde de configuracion general
	}

	nlapiLogExecution('DEBUG', 'getClienteInscriptoRegimenIIBB', 'RETURN estadoInscripcionCliente: ' + JSON.stringify(estadoInscripcionCliente))
	nlapiLogExecution('DEBUG', 'getClienteInscriptoRegimenIIBB', 'FIN - getClienteInscriptoRegimenIIBB');
	return estadoInscripcionCliente;
}

// MÃ©todo que me devuelve las jurisdicciones en las cuales la compaÃ±ia es Agente de Percepcion.
function obtenerJurisdiciconesAgentePercepcion(subsidiaria) {

	var resultadoJurisdicciones = new Object();
	resultadoJurisdicciones.idConfGeneral = 0;
	resultadoJurisdicciones.idEstadoExento = 0;
	resultadoJurisdicciones.idTipoContribIIBBDefault = 0;
	resultadoJurisdicciones.idTipoContribIIBBDefaultText = '';
	resultadoJurisdicciones.jurisdicciones = new Array();
	resultadoJurisdicciones.confGeneralDefinida = false;

	var filtroJurisdiccion = new Array();
	filtroJurisdiccion[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	if (!isEmpty(subsidiaria))
		filtroJurisdiccion[1] = new nlobjSearchFilter('custrecord_l54_pv_gral_subsidiaria', null, 'is', subsidiaria);
	var columnaJurisdiccion = new Array();
	columnaJurisdiccion[0] = new nlobjSearchColumn('internalid');
	columnaJurisdiccion[1] = new nlobjSearchColumn('custrecord_l54_pv_gral_estado_exento');
	columnaJurisdiccion[2] = new nlobjSearchColumn('custrecord_l54_pv_gral_jur_vinc_perc');
	columnaJurisdiccion[3] = new nlobjSearchColumn('custrecord_l54_pv_gral_contr_iibb_def_p');
	columnaJurisdiccion[4] = new nlobjSearchColumn('custrecord_l54_pv_gral_perc_caba');
	columnaJurisdiccion[5] = new nlobjSearchColumn('custrecord_l54_pv_gral_perc_bue');
	columnaJurisdiccion[6] = new nlobjSearchColumn('custrecord_l54_pv_gral_perc_tucuman');

	var resultadosJurisdiccion = new nlapiSearchRecord("customrecord_l54_pv_iibb_config_general", null, filtroJurisdiccion, columnaJurisdiccion);

	if (resultadosJurisdiccion != null && resultadosJurisdiccion.length > 0) {
		resultadoJurisdicciones.confGeneralDefinida = true;
		resultadoJurisdicciones.idConfGeneral = resultadosJurisdiccion[0].getValue('internalid');
		resultadoJurisdicciones.idEstadoExento = resultadosJurisdiccion[0].getValue('custrecord_l54_pv_gral_estado_exento');
		resultadoJurisdicciones.idTipoContribIIBBDefault = resultadosJurisdiccion[0].getValue('custrecord_l54_pv_gral_contr_iibb_def_p');
		resultadoJurisdicciones.idTipoContribIIBBDefaultText = resultadosJurisdiccion[0].getText('custrecord_l54_pv_gral_contr_iibb_def_p');
		resultadoJurisdicciones.calcularPercepcionCABA = resultadosJurisdiccion[0].getValue('custrecord_l54_pv_gral_perc_caba');
		resultadoJurisdicciones.calcularPercepcionBUE = resultadosJurisdiccion[0].getValue('custrecord_l54_pv_gral_perc_bue');
		resultadoJurisdicciones.calcularPercepcionTUCUMAN = resultadosJurisdiccion[0].getValue('custrecord_l54_pv_gral_perc_tucuman');
		var jurisdiccionesVinculadas = resultadosJurisdiccion[0].getValue('custrecord_l54_pv_gral_jur_vinc_perc');
		if (jurisdiccionesVinculadas != null && jurisdiccionesVinculadas.length > 0) {
			// Hago Split de las Jurisdicicones
			var arrayJurisdicciones = jurisdiccionesVinculadas.split(",");
			if (arrayJurisdicciones != null && arrayJurisdicciones.length > 0) {
				for (var i = 0; arrayJurisdicciones != null && i < arrayJurisdicciones.length; i++) {
					resultadoJurisdicciones.jurisdicciones[i] = arrayJurisdicciones[i];
				}
			}
		}
	}
	return resultadoJurisdicciones;

}

// Verifica Si el Objeto de Items de Percepcion A Agregar Ya posee un Item para la misma Jurisdiccion,Item y Porcentaje
function buscarItemPercepcion(codigosPercepcionIIBB, jurisdiccion, itemPercepcion) {

	nlapiLogExecution('DEBUG', 'buscarItemPercepcion', 'INICIO - buscarItemPercepcion - codigosPercepcionIIBB: ' + JSON.stringify(codigosPercepcionIIBB) + ' - jurisdiccion: ' + jurisdiccion + ' - itemPercepcion: ' + itemPercepcion);
	var posicion = -1;
	var encontrado = false;
	// var porcentajeFinal = parseFloat(parseFloat(convertToInteger(porcentaje), 10)/(100 * Math.pow(10, countDecimales(porcentaje))), 10).toString();
	// nlapiLogExecution('DEBUG', 'buscarItemPercepcion', 'porcentajeFinal: ' + porcentajeFinal);
	for (var i = 0; codigosPercepcionIIBB != null && codigosPercepcionIIBB.infoPer != null && i < codigosPercepcionIIBB.infoPer.length && encontrado == false; i++) {
		// if (codigosPercepcionIIBB.infoPer[i].jurisdiccion == jurisdiccion && codigosPercepcionIIBB.infoPer[i].item == itemPercepcion && codigosPercepcionIIBB.infoPer[i].porcentajeImpuesto == porcentajeFinal) {
		if (codigosPercepcionIIBB.infoPer[i].jurisdiccion == jurisdiccion && codigosPercepcionIIBB.infoPer[i].item == itemPercepcion) {
			encontrado = true;
			posicion = i;
		}
	}
	nlapiLogExecution('DEBUG', 'buscarItemPercepcion', 'FIN - buscarItemPercepcion - posicion: ' + posicion + ' - encontrado: ' + encontrado);
	return posicion;

}

// Método que me devuelve por cada Jurisdiccion de IIBB los Codigos de Percepcion a utilizar
function obtenerCodigosPercepcionIIBB(id_cliente, subsidiaria, objEstadosIIBB, idConfGeneral, tipoCambio, costoEnvio, tipoContribuyente, paramNoAplicaProvincia) {

	try {
		nlapiLogExecution('DEBUG', 'obtenerCodigosPercepcionIIBB', 'INICIO - obtenerCodigosPercepcionIIBB');
		var codigosPercepcionIIBB = new Object();
		codigosPercepcionIIBB.error = false;
		codigosPercepcionIIBB.infoPer = [];
		codigosPercepcionIIBB.warning = false;
		codigosPercepcionIIBB.mensajeWarning = "";
		codigosPercepcionIIBB.error = false;
		codigosPercepcionIIBB.mensajeError = "";

		var jurisdiccionesNoCumplenMinimo
		var mensajeInformar = "";
		var indiceObjeto = 0;

		var errorObtCodigoPerIIBB = false;
		var errorObtCodigoPerPadronGeneral = false;
		var errorImpuesto = false;
		var jurisdiccionesSinConfiguracion = [];
		var jurisdiccionesObligatoriasSinPadron = [];
		var informacionImpuestos = "";
		var infoImpuestoNombre = [];
		var infoImpuestoCodigo = [];
		var errorPadronExcluyenteGeneral = false;
		var jurisdiccionesExcluyentes = [];
		var jurisdNoAplicaCalPercPorInscripcion = '';
        var errorAplicaCalPercPorInscrip = false;

		var arregloCodigosPercepcionIIBB = obtenerArregloCodigosPercepcionPadronIIBB(id_cliente);

		var arregloCodigosPercepcionIIBBProducto = obtenerArreglo_pv_iibb_jur_producto();

		var arregloCodigosImpuestos = obtenerArreglo_impuesto(subsidiaria);

		var arregloConfiguracionGeneral = obtenerArregloConfGeneral(idConfGeneral);

		nlapiLogExecution('AUDIT', 'obtenerCodigosPercepcionIIBB', 'arregloConfiguracionGeneral: ' + JSON.stringify(arregloConfiguracionGeneral));
			
		// Busco el detalle de la ConfiguraciÃ³n General de IIBB en base a la Subsidiaria

			/* SE RECORRE EL ARRAY DE JURISDICCIONES DEL CLIENTE */


			for (var i = 0; objEstadosIIBB != null && objEstadosIIBB.jurisdicciones != null && i < objEstadosIIBB.jurisdicciones.length; i++) {

				var infoConfigDetalle = null;
                var buscarConfig = false;
                var errorCalcPercInscrip = false;

				if (!isEmpty(objEstadosIIBB.jurisdicciones[i]) && !isEmpty(idConfGeneral) && objEstadosIIBB.jurisdicciones[i].noCumpleMinimo == false) {

					nlapiLogExecution('DEBUG', 'obtenerCodigosPercepcionIIBB', 'objEstadosIIBB.jurisdicciones[i]: ' + JSON.stringify(objEstadosIIBB.jurisdicciones[i]) + ' - indice: ' + i);
					var codigoPerIIBB = {};
					codigoPerIIBB.excluyente = 'F';
					codigoPerIIBB.coeficientePercepcion = 1;
					codigoPerIIBB.estadoInscripcionPadron = '';
					codigoPerIIBB.coeficienteAlicuotaPerc = 1;
					codigoPerIIBB.esPadron = false;
					var errorParcial = false;
					var errorObtCodigoPerPadron = false;
					var errorPadronExcluyente = false;
					var condicionParcial = "";
					
					nlapiLogExecution('DEBUG', 'obtenerCodigosPercepcionIIBB', 'LINE 1217 - tipoContribuyente: ' + tipoContribuyente + ' / Jurisdicciones obligatorias sin padrón: ' + JSON.stringify(jurisdiccionesObligatoriasSinPadron) + ' - Jurisdicciones sin configuración: ' + JSON.stringify(jurisdiccionesSinConfiguracion) + ' - Jurisdicciones Excluyentes: ' + jurisdiccionesExcluyentes);

					var resultadosConfDetalle = null;

					if (!isEmpty(arregloConfiguracionGeneral) && arregloConfiguracionGeneral.length > 0) {


						/* INICIO - SE BUSCA LA CONFIG DE JURISDICCION QUE COINCIDA CON EL TIPO DE CONTRIBUYENTE DE IIBB DEL PROVEEDOR, SI ES JURISDICCION SEDE, EL TIPO DE CONTRIBUYENTE DE IVA Y CRITERIOS DE TERRITORIALIDAD */

						if (objEstadosIIBB.jurisdicciones[i].critJurisdUtilizacion == paramNoAplicaProvincia && objEstadosIIBB.jurisdicciones[i].critJurisdEntrega == paramNoAplicaProvincia && 
							objEstadosIIBB.jurisdicciones[i].critJurisdOrigen == paramNoAplicaProvincia && objEstadosIIBB.jurisdicciones[i].critJurisdFacturacion == paramNoAplicaProvincia && 
							objEstadosIIBB.jurisdicciones[i].critJurisdEmpresa == paramNoAplicaProvincia ) {

							if (objEstadosIIBB.jurisdicciones[i].aplicaCalcPercPorInscrip) {
								buscarConfig = true;
							} else {
								errorCalcPercInscrip = true;
								nlapiLogExecution('ERROR', 'obtenerCodigosPercepcionIIBB', 'LINE 7546 - No se procederá a buscar la alícuota para la jurisdiccion: ' + objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto + ' porque es una jurisdicción que no aplica a cálculo de percepciones por inscripción y no está en las líneas de las facturas/notas de créditos.');
							}
						} else {
							buscarConfig = true;
						}

						var resultadoConfGeneral = null;

						if (buscarConfig) {
							resultadoConfGeneral = arregloConfiguracionGeneral.filter(function (obj) {
								return ((obj.jurisdiccion === objEstadosIIBB.jurisdicciones[i].jurisdiccion) && (obj.tipoContribuyenteIIBB.split(',').indexOf(objEstadosIIBB.jurisdicciones[i].tipoContribuyente) >= 0) &&
									(obj.jurisdiccionSede === objEstadosIIBB.jurisdicciones[i].jurisdiccionSede) && (obj.tipoContribuyenteIVA.split(',').indexOf(tipoContribuyente) >= 0) && 
									(obj.critJurisdUtilizacion.split(',').indexOf(objEstadosIIBB.jurisdicciones[i].critJurisdUtilizacion) >= 0) && (obj.critJurisdEntrega.split(',').indexOf(objEstadosIIBB.jurisdicciones[i].critJurisdEntrega) >= 0) && 
									(obj.critJurisdOrigen.split(',').indexOf(objEstadosIIBB.jurisdicciones[i].critJurisdOrigen) >= 0) && (obj.critJurisdFacturacion.split(',').indexOf(objEstadosIIBB.jurisdicciones[i].critJurisdFacturacion) >= 0) && 
									(obj.critJurisdEmpresa.split(',').indexOf(objEstadosIIBB.jurisdicciones[i].critJurisdEmpresa) >= 0));
							});
						}
						
						/* FIN - SE BUSCA LA CONFIG DE JURISDICCION QUE COINCIDA CON EL TIPO DE CONTRIBUYENTE DE IIBB DEL PROVEEDOR, SI ES JURISDICCION SEDE, EL TIPO DE CONTRIBUYENTE DE IVA Y CRITERIOS DE TERRITORIALIDAD */


						nlapiLogExecution('DEBUG', 'obtenerCodigosPercepcionIIBB', 'LINE 7498 - resultadoConfGeneral: ' + JSON.stringify(resultadoConfGeneral));
						

						if (!isEmpty(resultadoConfGeneral) && resultadoConfGeneral.length > 0) {
							resultadosConfDetalle = new Array();
							resultadosConfDetalle[0] = new Object();
							resultadosConfDetalle[0].idInterno = resultadoConfGeneral[0].idInterno;
							resultadosConfDetalle[0].padronUsar = resultadoConfGeneral[0].padronUsar;
							resultadosConfDetalle[0].impuestoGeneral = resultadoConfGeneral[0].impuestoGeneral;
							resultadosConfDetalle[0].itemPercepcion = resultadoConfGeneral[0].itemPercepcion;
							resultadosConfDetalle[0].importeMinimo = resultadoConfGeneral[0].importeMinimo;
							resultadosConfDetalle[0].aplicarMinANeto = resultadoConfGeneral[0].aplicarMinANeto;
							resultadosConfDetalle[0].jurisdiccion = resultadoConfGeneral[0].jurisdiccion;
							resultadosConfDetalle[0].alicuota = resultadoConfGeneral[0].alicuota;
							resultadosConfDetalle[0].idInterno = resultadoConfGeneral[0].idInterno;
							resultadosConfDetalle[0].porcentaje_alicuota_utilizar = resultadoConfGeneral[0].porcentaje_alicuota_utilizar;
							resultadosConfDetalle[0].alicuota_especial = resultadoConfGeneral[0].alicuota_especial;
							resultadosConfDetalle[0].idConvenioLocal = resultadoConfGeneral[0].idConvenioLocal;
							resultadosConfDetalle[0].idConvenioMultilateral = resultadoConfGeneral[0].idConvenioMultilateral;
							resultadosConfDetalle[0].idResponsableInscripto = resultadoConfGeneral[0].idResponsableInscripto;
							resultadosConfDetalle[0].idMonotrotributista = resultadoConfGeneral[0].idMonotrotributista;
							resultadosConfDetalle[0].porcentajeEspecialCoeficienteCero = resultadoConfGeneral[0].porcentajeEspecialCoeficienteCero;
							resultadosConfDetalle[0].porcentajeAlicUtilSedeNoTucuman = resultadoConfGeneral[0].porcentajeAlicUtilSedeNoTucuman;
							resultadosConfDetalle[0].tipoContribuyenteIIBB = resultadoConfGeneral[0].tipoContribuyenteIIBB;
							resultadosConfDetalle[0].porcentajeEspecialUtilizarBI = resultadoConfGeneral[0].porcentajeEspecialUtilizarBI;
							resultadosConfDetalle[0].importeMinPercepcion = resultadoConfGeneral[0].importeMinPercepcion;
							resultadosConfDetalle[0].baseCalcAcumulada = resultadoConfGeneral[0].baseCalcAcumulada;
							resultadosConfDetalle[0].calcularSobreNeto = resultadoConfGeneral[0].calcularSobreNeto;
							resultadosConfDetalle[0].calcularSobreBruto = resultadoConfGeneral[0].calcularSobreBruto;
							resultadosConfDetalle[0].criterioPorcentajeEspecial = resultadoConfGeneral[0].criterioPorcentajeEspecial;
                            resultadosConfDetalle[0].idRegConfigDetalle = resultadoConfGeneral[0].idInterno;
						}
					}

					if (resultadosConfDetalle != null && resultadosConfDetalle.length > 0) {

						var padronUsar = resultadosConfDetalle[0].padronUsar;
						var itemPercepcion = resultadosConfDetalle[0].itemPercepcion;
						var importeMinimo = resultadosConfDetalle[0].importeMinimo;
						var aplicarMinANeto = resultadosConfDetalle[0].aplicarMinANeto;
						var alicuota_especial = resultadosConfDetalle[0].alicuota_especial;
						var porcentaje_alicuota_utilizar = resultadosConfDetalle[0].porcentaje_alicuota_utilizar;
						var idConvenioLocal = resultadosConfDetalle[0].idConvenioLocal;
						var idConvenioMultilateral = resultadosConfDetalle[0].idConvenioMultilateral;
						var idResponsableInscripto = resultadosConfDetalle[0].idResponsableInscripto;
						var idMonotrotributista = resultadosConfDetalle[0].idMonotrotributista;
						var porcentajeEspecialCoeficienteCero = resultadosConfDetalle[0].porcentajeEspecialCoeficienteCero;
						var porcentajeAlicUtilSedeNoTucuman = resultadosConfDetalle[0].porcentajeAlicUtilSedeNoTucuman;
						var porcentajeEspecialUtilizarBI = resultadosConfDetalle[0].porcentajeEspecialUtilizarBI;
						var importeMinPercepcion = resultadosConfDetalle[0].importeMinPercepcion;
						var baseCalcAcumulada = resultadosConfDetalle[0].baseCalcAcumulada;
						var calcularSobreNeto = resultadosConfDetalle[0].calcularSobreNeto;
						var calcularSobreBruto = resultadosConfDetalle[0].calcularSobreBruto;
						var criterioPorcentajeEspecial = resultadosConfDetalle[0].criterioPorcentajeEspecial;
						var idRegConfigDetalle = resultadosConfDetalle[0].idRegConfigDetalle;
						var montoFinal = 0.00;

						if (!isEmpty(calcularSobreBruto) && calcularSobreBruto) {
							montoFinal = parseFloat(objEstadosIIBB.jurisdicciones[i].importeBrutoLinea, 10);
						} else {
							montoFinal = parseFloat(objEstadosIIBB.jurisdicciones[i].importeNetoLinea, 10);
						}

						// costoEnvio!!!!!!!!!

						nlapiLogExecution('AUDIT', 'montoFinal antes', 'montoFinal: ' + montoFinal);
						nlapiLogExecution('AUDIT', 'criterioPorcentajeEspecial', 'criterioPorcentajeEspecial: ' + criterioPorcentajeEspecial);
						nlapiLogExecution('AUDIT', 'porcentajeEspecialUtilizarBI', 'porcentajeEspecialUtilizarBI: ' + porcentajeEspecialUtilizarBI);
						

						if (!isEmpty(itemPercepcion)) {
							var alicuotaPadronEncontrada = false;
							var alicuotaArticuloEncontrada = false;
							if ((!isEmpty(padronUsar) && padronUsar > 0) || (!isEmpty(objEstadosIIBB.jurisdicciones[i].jurisdiccion) && !isEmpty(resultadosConfDetalle[0].impuestoGeneral))) {
								// Consulto la Alicuota del Padron
								codigoPerIIBB = obtenerCodigoPercepcionPadronIIBB(arregloCodigosPercepcionIIBB, padronUsar, id_cliente, objEstadosIIBB.jurisdicciones[i].jurisdiccion, resultadosConfDetalle[0].impuestoGeneral);
								if (!isEmpty(codigoPerIIBB) && !isEmpty(codigoPerIIBB.codigo) && !isEmpty(codigoPerIIBB.alicuota) && !isNaN(codigoPerIIBB.alicuota) && codigoPerIIBB.codigo > 0) {
									alicuotaPadronEncontrada = true;
								}
							}
							if (!alicuotaPadronEncontrada && !objEstadosIIBB.jurisdicciones[i].esPercPadron) {
								// Busco si el Articulo Tiene Configurada una Alicuota para la Jurisdiccion
								codigoPerIIBB = obtener_pv_iibb_jur_producto(arregloCodigosPercepcionIIBBProducto, objEstadosIIBB.jurisdicciones[i].jurisdiccion, objEstadosIIBB.jurisdicciones[i].idArticulo);
								if (!isEmpty(codigoPerIIBB) && !isEmpty(codigoPerIIBB.codigo) && !isEmpty(codigoPerIIBB.alicuota) && !isNaN(codigoPerIIBB.alicuota) && codigoPerIIBB.codigo > 0) {
									alicuotaArticuloEncontrada = true;
								}
								// Si el Articulo No Tiene Configurado una Alicuota, La Tomo de la Configuracion General
								if (alicuotaArticuloEncontrada == false) {
									// Obtengo la Alicuota General
									codigoPerIIBB = new Object();
									/*codigoPerIIBB.codigo=resultadosConfDetalle[0].getValue('custrecord_l54_pv_det_imp_general');
									codigoPerIIBB.alicuota=resultadosConfDetalle[0].getValue('custrecord_l54_pv_det_alic_perc');*/
									codigoPerIIBB.codigo = resultadosConfDetalle[0].impuestoGeneral;
									codigoPerIIBB.alicuota = resultadosConfDetalle[0].alicuota;
									
									//codigoPerIIBB = resultadosConfDetalle[0].getValue('custrecord_l54_pv_det_imp_general');
									if (!isEmpty(codigoPerIIBB) && !isEmpty(codigoPerIIBB.codigo) && !isEmpty(codigoPerIIBB.alicuota) && !isNaN(codigoPerIIBB.alicuota) && codigoPerIIBB.codigo > 0) {
										alicuotaPadronEncontrada = true;
									} else {
										errorObtCodigoPerIIBB = true;
										errorParcial = true;
									}
								}
							} else {
								if (!alicuotaPadronEncontrada && objEstadosIIBB.jurisdicciones[i].esPercPadron) {
									errorObtCodigoPerPadronGeneral = true;
									errorObtCodigoPerPadron = true;
								} else {
									if (alicuotaPadronEncontrada && codigoPerIIBB.excluyente == 'T') {
										errorPadronExcluyenteGeneral = true;
										errorPadronExcluyente = true;
									}
								}
							}
						} else {
							errorObtCodigoPerIIBB = true;
							errorParcial = true;
						}
					} else {
						errorParcial = true;
						errorObtCodigoPerIIBB = true;
					}

					nlapiLogExecution('AUDIT', 'obtenerCodigosPercAux', 'LINE 2495 - errorParcial: ' + errorParcial + ' / errorObtCodigoPerPadron: ' + errorObtCodigoPerPadron +  ' / errorPadronExcluyente: ' + errorPadronExcluyente);

					if (errorParcial || errorObtCodigoPerPadron || errorPadronExcluyente) {
						if (errorObtCodigoPerPadron) {
							if (isEmpty(jurisdiccionesObligatoriasSinPadron) || jurisdiccionesObligatoriasSinPadron.length == 0) {
								jurisdiccionesObligatoriasSinPadron.push(objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto);
							} else {
								var jurisdiccionObligatoriaRepetida = jurisdiccionesObligatoriasSinPadron.filter(function (obj) {
									return (obj == objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto);
								});
								if (isEmpty(jurisdiccionObligatoriaRepetida) || jurisdiccionObligatoriaRepetida.length == 0) {
									jurisdiccionesObligatoriasSinPadron.push(objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto);
								}
							}
						}
						if (errorParcial) {
							if (errorCalcPercInscrip) {
								errorAplicaCalPercPorInscrip = true;
                                jurisdNoAplicaCalPercPorInscripcion += (isEmpty(jurisdNoAplicaCalPercPorInscripcion)) ? objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto : ', ' + objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto;
							} else {
								if (isEmpty(jurisdiccionesSinConfiguracion) || jurisdiccionesSinConfiguracion.length == 0) {
									jurisdiccionesSinConfiguracion.push(objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto);
								} else {
									var jurisdiccionSinConfiguracionRepetida = jurisdiccionesSinConfiguracion.filter(function (obj) {
										return (obj == objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto);
									});
									if (isEmpty(jurisdiccionSinConfiguracionRepetida) || jurisdiccionSinConfiguracionRepetida.length == 0) {
										jurisdiccionesSinConfiguracion.push(objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto);
									}
								}
							}
						}
						if (errorPadronExcluyente) {
							if (isEmpty(jurisdiccionesExcluyentes) || jurisdiccionesExcluyentes.length == 0) {
								jurisdiccionesExcluyentes.push(objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto);
							} else {
								var jurisdiccionesExcluyentesRepetida = jurisdiccionesExcluyentes.filter(function (obj) {
									return (obj == objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto);
								});
								if (isEmpty(jurisdiccionesExcluyentesRepetida) || jurisdiccionesExcluyentesRepetida.length == 0) {
									jurisdiccionesExcluyentes.push(objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto);
								}
							}
						}
					} else {
							// Genero el Objeto de Respuesta
							// Inicio Obtener Informacion del Impuesto
							var infoImpuesto = obtener_impuesto(arregloCodigosImpuestos, codigoPerIIBB.codigo);
							if (infoImpuesto != null && infoImpuesto.encontrado == true) {
								// Fin Obtener Informacion del Impuesto
								// Inicio Verificar Si no Hay un mismo Impuesto para la Misma Jurisdicicon,Item y Porcentaje
								// var posicion = buscarItemPercepcion(codigosPercepcionIIBB, objEstadosIIBB.jurisdicciones[i].jurisdiccion, itemPercepcion, codigoPerIIBB.alicuota);
								// Fin Verificar Si no Hay un mismo Impuesto para la Misma Jurisdicicon,Item y Porcentaje

								var infoPercepcion = {};
								infoPercepcion.idRegConfigDetalle = idRegConfigDetalle;
								infoPercepcion.codigo = codigoPerIIBB.codigo;
								infoPercepcion.item = itemPercepcion;
								infoPercepcion.importeMinimo = importeMinimo;
								infoPercepcion.aplicarMinANeto = aplicarMinANeto;
								infoPercepcion.importeBrutoLinea = parseFloat(objEstadosIIBB.jurisdicciones[i].importeBrutoLinea, 10);;
								infoPercepcion.condicion = objEstadosIIBB.jurisdicciones[i].tipoContribuyenteTexto;
								infoPercepcion.condicionID = objEstadosIIBB.jurisdicciones[i].tipoContribuyente;
								infoPercepcion.jurisdiccion = objEstadosIIBB.jurisdicciones[i].jurisdiccion;
								infoPercepcion.coeficienteBaseImponible = objEstadosIIBB.jurisdicciones[i].coeficienteBaseImponible;
								infoPercepcion.jurisdiccionCodigo = objEstadosIIBB.jurisdicciones[i].jurisdiccionCodigo;
								infoPercepcion.jurisdiccionTexto = objEstadosIIBB.jurisdicciones[i].jurisdiccionTexto;
								infoPercepcion.porcentajeImpuesto = parseFloat(parseFloat(convertToInteger(parseFloat(codigoPerIIBB.alicuota, 10)), 10) / (100 * Math.pow(10, countDecimales(codigoPerIIBB.alicuota))), 10).toString();
								/* if (codigoPerIIBB.alicuota.search('%') != -1)
									infoPercepcion.porcentajeImpuesto = codigoPerIIBB.alicuota.substring(0, codigoPerIIBB.alicuota.length - 1);
								else
									infoPercepcion.porcentajeImpuesto = parseFloat(parseFloat(convertToInteger(codigoPerIIBB.alicuota), 10)/(100 * Math.pow(10, countDecimales(codigoPerIIBB.alicuota))), 10).toString(); */
								infoPercepcion.descripcionImpuesto = infoImpuesto.descripcion;
                                infoPercepcion.esJurisdEntrega = objEstadosIIBB.jurisdicciones[i].esJurisdEntrega;
								
								
								// infoPercepcion.importe = parseFloat(montoFinal) + parseFloat(costoEnvio);
								infoPercepcion.importe = parseFloat(montoFinal);
								
								// !!!!!!!! parseFloat(costoEnvio);

								infoPercepcion.estadoInscripcionPadron = codigoPerIIBB.estadoInscripcionPadron;
								infoPercepcion.coeficientePercepcion = codigoPerIIBB.coeficientePercepcion;
								infoPercepcion.esPadron = codigoPerIIBB.esPadron;
								infoPercepcion.porcentaje_alicuota_utilizar = porcentaje_alicuota_utilizar;
								infoPercepcion.alicuota_especial = alicuota_especial;
								infoPercepcion.idConvenioLocal = idConvenioLocal;
								infoPercepcion.idConvenioMultilateral = idConvenioMultilateral;
								infoPercepcion.idResponsableInscripto = idResponsableInscripto;
								infoPercepcion.idMonotrotributista = idMonotrotributista;
								infoPercepcion.porcentajeEspecialCoeficienteCero = porcentajeEspecialCoeficienteCero;
								infoPercepcion.porcentajeAlicUtilSedeNoTucuman = porcentajeAlicUtilSedeNoTucuman;
								infoPercepcion.porcentajeEspecialUtilizarBI = porcentajeEspecialUtilizarBI;
								infoPercepcion.importeMinPercepcion = importeMinPercepcion;
								infoPercepcion.montoFinal = montoFinal;
								infoPercepcion.baseCalcAcumulada = baseCalcAcumulada;
								infoPercepcion.calcularSobreBruto = calcularSobreBruto;
								infoPercepcion.criterioPorcentajeEspecial = criterioPorcentajeEspecial;
								infoPercepcion.coeficienteAlicuotaPerc = 1;

								if (!isEmpty(codigoPerIIBB.coeficienteAlicuotaPerc)) {
									if (codigoPerIIBB.coeficienteAlicuotaPerc.search('%') != -1)
										infoPercepcion.coeficienteAlicuotaPerc = parseFloat(parseFloat(codigoPerIIBB.coeficienteAlicuotaPerc.substring(0, codigoPerIIBB.coeficienteAlicuotaPerc.length - 1), 10) / 100, 10);
									else
										infoPercepcion.coeficienteAlicuotaPerc = parseFloat(codigoPerIIBB.coeficienteAlicuotaPerc, 10);

									infoPercepcion.coeficienteAlicuotaPerc = infoPercepcion.coeficienteAlicuotaPerc == 0 ? 1 : infoPercepcion.coeficienteAlicuotaPerc;
								}

								
								// Nuevo - Norma IIBB
								if (!isEmpty(infoImpuesto.normaIIBB)) {
									infoPercepcion.normaIIBB = infoImpuesto.normaIIBB;
								}

									
								//-------------- INICIO - VERIFICACION DE SI EXISTE UN CODIGO DE PERCEPCION QUE YA COINCIDA CON EL QUE SE INTENTA PROCESA -----------//////

                                var regEncontrado = false;
								
                                if (codigosPercepcionIIBB.infoPer.length > 0) {
                                    for (var j = 0; j < codigosPercepcionIIBB.infoPer.length && !regEncontrado; j++) {
                                        if (codigosPercepcionIIBB.infoPer[j].jurisdiccion == infoPercepcion.jurisdiccion && codigosPercepcionIIBB.infoPer[j].codigo == infoPercepcion.codigo && 
                                            codigosPercepcionIIBB.infoPer[j].idRegConfigDetalle == infoPercepcion.idRegConfigDetalle && codigosPercepcionIIBB.infoPer[j].porcentajeImpuesto == infoPercepcion.porcentajeImpuesto) 
                                        {
                                            regEncontrado = true;
                                            codigosPercepcionIIBB.infoPer[j].importe += parseFloat(infoPercepcion.montoFinal, 10);
                                        }
                                    }
                                }

                                if (!regEncontrado) {
                                    codigosPercepcionIIBB.infoPer.push(infoPercepcion);
                                }

                                //-------------- FIN - VERIFICACION DE SI EXISTE UN CODIGO DE PERCEPCION QUE YA COINCIDA CON EL QUE SE INTENTA PROCESA -----------//////


                                nlapiLogExecution('DEBUG', 'obtenerCodigosRetencionIIBB', 'LINE 5432 - infoPercepcion: ' + JSON.stringify(infoPercepcion));
										

								indiceObjeto = parseInt(indiceObjeto, 10) + parseInt(1, 10);
							} else {
								errorImpuesto = true;
								// Error Obteniendo Informacion del Impuesto
								if (isEmpty(informacionImpuestos)) {
									if (isEmpty(infoImpuesto)) {
										informacionImpuestos = "No se Encuentran Configurado Correctamente los Siguientes Impuestos :  \n";
										infoImpuestoCodigo.push(codigoPerIIBB.codigo);
										//informacionImpuestos += "Impuesto con ID : " + codigoPerIIBB.codigo;
									} else {
										informacionImpuestos = "No se Encuentran Configurado Correctamente los Siguientes Impuestos :  \n";
										infoImpuestoNombre.push(infoImpuesto.nombre);
										//informacionImpuestos += " Impuesto  : " + infoImpuesto.nombre;
									}
								} else {
									if (isEmpty(infoImpuesto)) {
										if (isEmpty(infoImpuestoCodigo) || infoImpuestoCodigo.length == 0) {
											infoImpuestoCodigo.push(codigoPerIIBB.codigo);
										} else {
											var codigoImpuestoRepetido = infoImpuestoCodigo.filter(function (obj) {
												return (obj == codigoPerIIBB.codigo);
											});
											if (isEmpty(codigoImpuestoRepetido) || codigoImpuestoRepetido.length == 0) {
												infoImpuestoCodigo.push(codigoPerIIBB.codigo);
											}
										}
										//informacionImpuestos = informacionImpuestos + "," + "Impuesto con ID : " + codigoPerIIBB.codigo;
									} else {
										if (isEmpty(infoImpuestoNombre) || infoImpuestoNombre.length == 0) {
											infoImpuestoNombre.push(infoImpuesto.nombre);
										} else {
											var nombreImpuestoRepetido = infoImpuestoNombre.filter(function (obj) {
												return (obj == infoImpuesto.nombre);
											});
											if (isEmpty(nombreImpuestoRepetido) || nombreImpuestoRepetido.length == 0) {
												infoImpuestoNombre.push(infoImpuesto.nombre);
											}
										}
										//informacionImpuestos = informacionImpuestos + "," + "Impuesto  : " + infoImpuesto.nombre;
									}
								}
							}
					}
				}
			} // Fin for para recorrer información de las jurisdicciones
		

		nlapiLogExecution('DEBUG', 'obtenerCodigosPercepcionIIBB', 'errorObtCodigoPerIIBB: ' + errorObtCodigoPerIIBB + ' - errorImpuesto: ' + errorImpuesto + ' - errorObtCodigoPerPadronGeneral: ' + errorObtCodigoPerPadronGeneral + ' - errorPadronExcluyenteGeneral: ' + errorPadronExcluyenteGeneral);
		if (errorObtCodigoPerIIBB == true || errorImpuesto == true || errorObtCodigoPerPadronGeneral || errorPadronExcluyenteGeneral || errorAplicaCalPercPorInscrip) {

			if (errorAplicaCalPercPorInscrip) {
                mensajeInformar += 'No se aplica el cálculo de percepciones para las provincias: ' + jurisdNoAplicaCalPercPorInscripcion + ' porque es una jurisdicción en la cuál está inscripto el cliente pero que no aplica a cálculo de percepciones por inscripción y no está en las líneas de las facturas/notas de créditos. \n';
			}

			if (errorObtCodigoPerIIBB) {
				var jurisdiccionesSinConfiguracionText = "";

				for (var i = 0; i < jurisdiccionesSinConfiguracion.length; i++) {
					var resultJurisd = codigosPercepcionIIBB.infoPer.filter(function (obj) { return obj.jurisdiccionTexto === jurisdiccionesSinConfiguracion[i] });

					if (isEmpty(resultJurisd) || resultJurisd.length == 0) {
						if (i == 0 || isEmpty(jurisdiccionesSinConfiguracionText)) {
							jurisdiccionesSinConfiguracionText = jurisdiccionesSinConfiguracion[i];
						} else {
							jurisdiccionesSinConfiguracionText += ", " + jurisdiccionesSinConfiguracion[i];
						}
					}
				}

				if (!isEmpty(jurisdiccionesSinConfiguracionText)) {
					mensajeInformar += "No se encuentra correctamente parametrizada la Configuración Detalle IIBB para las Jurisdicciones : " + jurisdiccionesSinConfiguracionText + ". Pertenecientes a la Configuración General con ID Interno : " + idConfGeneral + '. \n';
				}
			}

			if (errorObtCodigoPerPadronGeneral) {
				var jurisdiccionesObligatoriasSinPadronText = "";

				for (var i = 0; i < jurisdiccionesObligatoriasSinPadron.length; i++) {
					var resultJurisd = codigosPercepcionIIBB.infoPer.filter(function (obj) { return obj.jurisdiccionTexto === jurisdiccionesObligatoriasSinPadron[i] });

					if (isEmpty(resultJurisd) || resultJurisd.length == 0) {
						if (i == 0 || isEmpty(jurisdiccionesObligatoriasSinPadronText)) {
							jurisdiccionesObligatoriasSinPadronText = jurisdiccionesObligatoriasSinPadron[i];
						} else {
							jurisdiccionesObligatoriasSinPadronText += ", " + jurisdiccionesObligatoriasSinPadron[i];
						}
					}
				}

				if (!isEmpty(jurisdiccionesObligatoriasSinPadronText)) {
					mensajeInformar += "No se encuentra correctamente parametrizada la Configuración de Padrón para el cliente actual en las Jurisdicciones : " + jurisdiccionesObligatoriasSinPadronText + " configuradas como obligatorias en la Configuración General con ID Interno : " + idConfGeneral + '. \n';
				}
			}

			if (errorPadronExcluyenteGeneral) {
				var jurisdiccionesExcluyentesText = "";

				for (var i = 0; i < jurisdiccionesExcluyentes.length; i++) {
					var resultJurisd = codigosPercepcionIIBB.infoPer.filter(function (obj) { return obj.jurisdiccionTexto === jurisdiccionesExcluyentes[i] });

					if (isEmpty(resultJurisd) || resultJurisd.length == 0) {
						if (i == 0 || isEmpty(jurisdiccionesExcluyentesText)) {
							jurisdiccionesExcluyentesText = jurisdiccionesExcluyentes[i];
						} else {
							jurisdiccionesExcluyentesText += ", " + jurisdiccionesExcluyentes[i];
						}
					}
				}

				if (!isEmpty(jurisdiccionesExcluyentesText)) {
					mensajeInformar += "El cliente está excluido por la Configuración de Padrón en las Jurisdicciones : " + jurisdiccionesExcluyentesText + ', por lo tanto no se le calculará percepciones en las mismas. \n';
				}
			}

			if (!isEmpty(informacionImpuestos)) {
				var infoImpuestoCodigoText = "";
				for (var i = 0; i < infoImpuestoCodigo.length; i++) {
					if (i == 0) {
						infoImpuestoCodigoText = 'Impuestos con ID: ' + infoImpuestoCodigo[i];
					} else {
						infoImpuestoCodigoText += ", " + infoImpuestoCodigo[i];
					}
				}
				var infoImpuestoNombreText = "";
				for (var i = 0; i < infoImpuestoNombre.length; i++) {
					if (i == 0) {
						if (!isEmpty(infoImpuestoCodigoText)) {
							infoImpuestoCodigoText += '. \n';
						}
						infoImpuestoNombreText = 'Impuestos con nombre: ' + infoImpuestoNombre[i];
					} else {
						infoImpuestoNombreText += ", " + infoImpuestoNombre[i];
					}
				}

				informacionImpuestos += infoImpuestoCodigoText + infoImpuestoNombreText;

				if (!isEmpty(mensajeInformar)) {
					mensajeInformar = mensajeInformar + informacionImpuestos;
				} else {
					mensajeInformar = informacionImpuestos;
				}
			}

			if (!isEmpty(mensajeInformar)) {
				if (codigosPercepcionIIBB.error) {
					codigosPercepcionIIBB.mensajeError = codigosPercepcionIIBB.mensajeWarning + mensajeInformar;
				} else {
					codigosPercepcionIIBB.warning = true;
					codigosPercepcionIIBB.mensajeWarning = codigosPercepcionIIBB.mensajeWarning + mensajeInformar;
				}
			}
		}
	} catch (e) {
		codigosPercepcionIIBB.error = true;
		nlapiLogExecution('ERROR', 'obtenerCodigosPercepcionIIBB', 'ERROR - NetSuite Error al obtener los códigos de percepción: ' + e.message);
		codigosPercepcionIIBB.mensajeError = codigosPercepcionIIBB.mensajeWarning + 'No se calculará percepciones porque existe un error al obtener los códigos de percepción.';
	}

	nlapiLogExecution('DEBUG', 'obtenerCodigosPercepcionIIBB', 'RETURN - codigosPercepcionIIBB: ' + JSON.stringify(codigosPercepcionIIBB));
	nlapiLogExecution('DEBUG', 'obtenerCodigosPercepcionIIBB', 'FIN - obtenerCodigosPercepcionIIBB');
	return codigosPercepcionIIBB;
}

// MÃ©todo que me devuelve el Codigo de Percepcion para un Tipo de Padron de IIBB
function obtenerCodigoPercepcionPadronIIBB(arragloCodigosPercepcionIIBB, idTipoPadron, id_cliente, jurisdiccion, impuestoGeneral) {

	nlapiLogExecution('DEBUG', 'obtenerCodigoPercepcionPadronIIBB', 'INICIO - obtenerCodigoPercepcionPadronIIBB');
	//var codigoPercepcionIIBB = "";
	var codigoPercepcionIIBB = {};
	codigoPercepcionIIBB.codigo = "";
	codigoPercepcionIIBB.alicuota = "";

	if ((arragloCodigosPercepcionIIBB != null && arragloCodigosPercepcionIIBB.length > 0 && !isEmpty(idTipoPadron) && !isEmpty(id_cliente)) || (!isEmpty(jurisdiccion) && !isEmpty(id_cliente) && !isEmpty(impuestoGeneral))) {

		if (arragloCodigosPercepcionIIBB != null && arragloCodigosPercepcionIIBB.length > 0 && !isEmpty(idTipoPadron) && !isEmpty(id_cliente) && !isEmpty(impuestoGeneral)) {
			var resultadoCodigosPercepcionPadronIIBB = arragloCodigosPercepcionIIBB.filter(function (obj) {
				return (obj.tipoPadron === idTipoPadron && obj.cliente === id_cliente && obj.codigo === impuestoGeneral);
			});
		} else {
			if (!isEmpty(jurisdiccion) && !isEmpty(id_cliente) && !isEmpty(impuestoGeneral)) {
				var resultadoCodigosPercepcionPadronIIBB = arragloCodigosPercepcionIIBB.filter(function (obj) {
					return (obj.jurisdiccion === jurisdiccion && obj.cliente === id_cliente && obj.codigo === impuestoGeneral);
				});
			}
		}

		if (!isEmpty(resultadoCodigosPercepcionPadronIIBB) && resultadoCodigosPercepcionPadronIIBB.length > 0) {
			var codigoPercepcionPadron = resultadoCodigosPercepcionPadronIIBB[0].codigo;
			var alicuotaPercepcionPadron = resultadoCodigosPercepcionPadronIIBB[0].alicuota;
			var estadoInscripcionPadron = resultadoCodigosPercepcionPadronIIBB[0].estadoInscripcionPadron;
			var excluyente = resultadoCodigosPercepcionPadronIIBB[0].excluyente;
			var coeficientePercepcion = resultadoCodigosPercepcionPadronIIBB[0].coeficientePercepcion;
			var coeficienteAlicuotaPerc = resultadoCodigosPercepcionPadronIIBB[0].coeficienteAlicuotaPerc;
			codigoPercepcionIIBB.esPadron = true;

			if (!isEmpty(codigoPercepcionPadron))
				codigoPercepcionIIBB.codigo = codigoPercepcionPadron;

			if (!isEmpty(alicuotaPercepcionPadron))
				codigoPercepcionIIBB.alicuota = alicuotaPercepcionPadron;

			if (!isEmpty(estadoInscripcionPadron))
				codigoPercepcionIIBB.estadoInscripcionPadron = estadoInscripcionPadron;

			if (!isEmpty(excluyente))
				codigoPercepcionIIBB.excluyente = excluyente;

			if (!isEmpty(coeficientePercepcion))
				codigoPercepcionIIBB.coeficientePercepcion = coeficientePercepcion;

			if (!isEmpty(coeficienteAlicuotaPerc))
				codigoPercepcionIIBB.coeficienteAlicuotaPerc = coeficienteAlicuotaPerc;
		}

	}

	nlapiLogExecution('DEBUG', 'obtenerCodigoPercepcionPadronIIBB', 'RETURN - codigoPercepcionIIBB: ' + JSON.stringify(codigoPercepcionIIBB));
	nlapiLogExecution('DEBUG', 'obtenerCodigoPercepcionPadronIIBB', 'FIN - obtenerCodigoPercepcionPadronIIBB');
	return codigoPercepcionIIBB;
}

// MÃ©todo que me devuelve el Codigo de Percepcion para un Tipo de Padron de IIBB
function obtenerArregloCodigosPercepcionPadronIIBB(id_cliente) {

	nlapiLogExecution('DEBUG', 'obtenerArregloCodigosPercepcionPadronIIBB', 'INICIO - obtenerArregloCodigosPercepcionPadronIIBB');
	//var codigoPercepcionIIBB = "";
	var arragloCodigosPercepcionIIBB = new Array();
	/*var arragloCodigosPercepcionIIBB = new Object();
	arragloCodigosPercepcionIIBB.codigo="";
	arragloCodigosPercepcionIIBB.alicuota="";
	arragloCodigosPercepcionIIBB.tipoPadron="";
	arragloCodigosPercepcionIIBB.cliente="";*/

	if (!isEmpty(id_cliente)) {
		var filtroPadron = new Array();
		filtroPadron[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filtroPadron[1] = new nlobjSearchFilter('custrecord_l54_pv_jc_cliente', null, 'is', id_cliente);

		var columnasPadron = new Array();
		columnasPadron[0] = new nlobjSearchColumn('internalid');
		columnasPadron[1] = new nlobjSearchColumn('custrecord_l54_pv_jc_codigo_impuesto');
		// Nuevo - Alicuota de Percepcion
		columnasPadron[2] = new nlobjSearchColumn('custrecord_l54_pv_jc_alic_perc');
		columnasPadron[3] = new nlobjSearchColumn('custrecord_l54_pv_jc_tipo_padron');
		columnasPadron[4] = new nlobjSearchColumn('custrecord_l54_pv_jc_jurisdiccion');
		columnasPadron[5] = new nlobjSearchColumn('custrecord_l54_pv_jc_estado'); // Tipo Contribuyente o estado inscripción
		columnasPadron[6] = new nlobjSearchColumn('custrecord_l54_pv_jc_excluyente'); // Excluyente
		columnasPadron[7] = new nlobjSearchColumn('custrecord_l54_pv_jc_coeficiente_ret'); // Coeficiente Retención
		columnasPadron[8] = new nlobjSearchColumn('custrecord_l54_pv_jc_coeficiente_perc'); // Coeficiente Percepción
		columnasPadron[9] = new nlobjSearchColumn('custrecord_l54_pv_jc_alic_coe_ali_perc'); // Coeficiente Alicuota Percepción

		var resultadosPadron = new nlapiSearchRecord("customrecord_l54_pv_iibb_jur_cliente", null, filtroPadron, columnasPadron);

		if (resultadosPadron != null && resultadosPadron.length > 0) {
			for (var i = 0; i < resultadosPadron.length; i++) {
				// Verifico si la Juridiccion usa Padron o no
				var codigoPercepcionPadron = resultadosPadron[i].getValue(columnasPadron[1]);
				var alicuotaPercepcionPadron = resultadosPadron[i].getValue(columnasPadron[2]);
				var tipoPadron = resultadosPadron[i].getValue(columnasPadron[3]);
				var jurisdiccion = resultadosPadron[i].getValue(columnasPadron[4]);
				var estadoInscripcionPadron = resultadosPadron[i].getValue(columnasPadron[5]);
				var excluyente = resultadosPadron[i].getValue(columnasPadron[6]);
				var coeficienteRetencion = resultadosPadron[i].getValue(columnasPadron[7]);
				var coeficientePercepcion = resultadosPadron[i].getValue(columnasPadron[8]);
				var coeficienteAlicuotaPerc = resultadosPadron[i].getValue(columnasPadron[9]);

				arragloCodigosPercepcionIIBB[i] = new Object();

				arragloCodigosPercepcionIIBB[i].cliente = id_cliente;

				if (!isEmpty(codigoPercepcionPadron))
					arragloCodigosPercepcionIIBB[i].codigo = codigoPercepcionPadron;

				if (!isEmpty(alicuotaPercepcionPadron))
					arragloCodigosPercepcionIIBB[i].alicuota = alicuotaPercepcionPadron;

				if (!isEmpty(tipoPadron))
					arragloCodigosPercepcionIIBB[i].tipoPadron = tipoPadron;

				if (!isEmpty(jurisdiccion))
					arragloCodigosPercepcionIIBB[i].jurisdiccion = jurisdiccion;

				if (!isEmpty(estadoInscripcionPadron))
					arragloCodigosPercepcionIIBB[i].estadoInscripcionPadron = estadoInscripcionPadron;

				if (!isEmpty(excluyente))
					arragloCodigosPercepcionIIBB[i].excluyente = excluyente;
				else
					arragloCodigosPercepcionIIBB[i].excluyente = 'F';

				if (!isEmpty(coeficienteRetencion))
					arragloCodigosPercepcionIIBB[i].coeficienteRetencion = coeficienteRetencion;

				if (!isEmpty(coeficientePercepcion))
					arragloCodigosPercepcionIIBB[i].coeficientePercepcion = coeficientePercepcion;

				if (!isEmpty(coeficienteAlicuotaPerc))
					arragloCodigosPercepcionIIBB[i].coeficienteAlicuotaPerc = coeficienteAlicuotaPerc;
			}
		}
	}

	nlapiLogExecution('DEBUG', 'obtenerArregloCodigosPercepcionPadronIIBB', 'RETURN - arragloCodigosPercepcionIIBB: ' + JSON.stringify(arragloCodigosPercepcionIIBB));
	nlapiLogExecution('DEBUG', 'obtenerArregloCodigosPercepcionPadronIIBB', 'FIN - obtenerArregloCodigosPercepcionPadronIIBB');
	return arragloCodigosPercepcionIIBB;
}

function obtenerArregloConfGeneral(idConfGeneral) {

	var informacionArregloConfGeneral = new Array();

	if (!isEmpty(idConfGeneral)) {

		var filtroConfDetalle = new Array();
		filtroConfDetalle[0] = new nlobjSearchFilter('custrecord_l54_pv_det_link_padre', null, 'is', idConfGeneral);
		filtroConfDetalle[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F');

		var columnasConfDetalle = new Array();
		columnasConfDetalle[0] = new nlobjSearchColumn('internalid');
		columnasConfDetalle[1] = new nlobjSearchColumn('custrecord_l54_pv_det_tipo_pad');
		columnasConfDetalle[2] = new nlobjSearchColumn('custrecord_l54_pv_det_imp_general');
		columnasConfDetalle[3] = new nlobjSearchColumn('custrecord_l54_pv_det_item_percepcion');
		columnasConfDetalle[4] = new nlobjSearchColumn('custrecord_l54_pv_det_minimo');
		columnasConfDetalle[5] = new nlobjSearchColumn('custrecord_l54_pv_det_min_neto');
		// Nuevo - Obtener Alicuota Percepcion
		columnasConfDetalle[6] = new nlobjSearchColumn('custrecord_l54_pv_det_alic_perc');
		columnasConfDetalle[7] = new nlobjSearchColumn('custrecord_l54_pv_det_jurisdiccion');
		// Nuevo - Obtener Alicuota Especial y porcentaje alicuota a utilizar (Jurisdicción TUCUMÁN) - Tipos de Contribuyente IIBB y Condición Fiscal.
		columnasConfDetalle[8] = new nlobjSearchColumn('custrecord_l54_pv_det_por_ali_ut_sed_tuc');
		columnasConfDetalle[9] = new nlobjSearchColumn('custrecord_l54_pv_det_alicuota_especial');
		columnasConfDetalle[10] = new nlobjSearchColumn('custrecord_l54_pv_det_cont_iibb_conv_loc');
		columnasConfDetalle[11] = new nlobjSearchColumn('custrecord_l54_pv_det_cont_iibb_conv_mul');
		columnasConfDetalle[12] = new nlobjSearchColumn('custrecord_l54_pv_det_cond_fisc_resp_ins');
		columnasConfDetalle[13] = new nlobjSearchColumn('custrecord_l54_pv_det_cond_fisc_monotrib');
		columnasConfDetalle[14] = new nlobjSearchColumn('custrecord_l54_pv_det_ali_esp_coe_pe_cer');
		columnasConfDetalle[15] = new nlobjSearchColumn('custrecord_l54_pv_det_po_al_ut_se_no_tuc');
		columnasConfDetalle[16] = new nlobjSearchColumn('custrecord_l54_pv_det_tipo_contribuyente');
		columnasConfDetalle[17] = new nlobjSearchColumn('custrecord_l54_pv_det_porc_espe_percep');
		columnasConfDetalle[18] = new nlobjSearchColumn('custrecord_l54_pv_det_calc_juris_sede');
		columnasConfDetalle[19] = new nlobjSearchColumn('custrecord_l54_pv_det_tipo_cont_iva_perc');
		columnasConfDetalle[20] = new nlobjSearchColumn('custrecord_l54_pv_det_imp_min_percepcion');
		columnasConfDetalle[21] = new nlobjSearchColumn('custrecord_l54_pv_det_bas_calc_acumulada');
		columnasConfDetalle[22] = new nlobjSearchColumn('custrecord_l54_op_cal_im_re_pe_ca_im_net', 'custrecord_l54_pv_det_criterio_calculo');
		columnasConfDetalle[23] = new nlobjSearchColumn('custrecord_l54_op_cal_im_re_pe_ca_im_bru', 'custrecord_l54_pv_det_criterio_calculo');
		columnasConfDetalle[24] = new nlobjSearchColumn('custrecord_l54_codigo_criterio','custrecord_l54_pv_det_criterio_porct_per');
		columnasConfDetalle[25] = new nlobjSearchColumn('custrecord_l54_pv_det_ve_uti_efe_cli_per');
		columnasConfDetalle[26] = new nlobjSearchColumn('custrecord_l54_pv_det_ver_dire_entre_per');
		columnasConfDetalle[27] = new nlobjSearchColumn('custrecord_l54_pv_det_ver_dir_orig_per');
		columnasConfDetalle[28] = new nlobjSearchColumn('custrecord_l54_pv_det_ver_dir_fac_per');
		columnasConfDetalle[29] = new nlobjSearchColumn('custrecord_l54_pv_det_ver_dir_cli_per');


		var resultadosConfDetalle = new nlapiSearchRecord("customrecord_l54_pv_iibb_config_detalle", null, filtroConfDetalle, columnasConfDetalle);

		if (resultadosConfDetalle != null && resultadosConfDetalle.length > 0) {
			for (var i = 0; i < resultadosConfDetalle.length; i++) {
				// Verifico si la Juridiccion usa Padron o no
				informacionArregloConfGeneral[i] = new Object();
				informacionArregloConfGeneral[i].idInterno = resultadosConfDetalle[i].getValue('internalid');
				informacionArregloConfGeneral[i].padronUsar = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_tipo_pad');
				informacionArregloConfGeneral[i].impuestoGeneral = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_imp_general');
				informacionArregloConfGeneral[i].itemPercepcion = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_item_percepcion');
				informacionArregloConfGeneral[i].importeMinimo = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_minimo');
				informacionArregloConfGeneral[i].aplicarMinANeto = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_min_neto');
				informacionArregloConfGeneral[i].alicuota = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_alic_perc');
				informacionArregloConfGeneral[i].jurisdiccion = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_jurisdiccion');
				informacionArregloConfGeneral[i].porcentaje_alicuota_utilizar = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_por_ali_ut_sed_tuc');
				informacionArregloConfGeneral[i].alicuota_especial = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_alicuota_especial');
				informacionArregloConfGeneral[i].idConvenioLocal = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_cont_iibb_conv_loc');
				informacionArregloConfGeneral[i].idConvenioMultilateral = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_cont_iibb_conv_mul');
				informacionArregloConfGeneral[i].idResponsableInscripto = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_cond_fisc_resp_ins');
				informacionArregloConfGeneral[i].idMonotrotributista = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_cond_fisc_monotrib');
				informacionArregloConfGeneral[i].porcentajeEspecialCoeficienteCero = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_ali_esp_coe_pe_cer');
				informacionArregloConfGeneral[i].porcentajeAlicUtilSedeNoTucuman = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_po_al_ut_se_no_tuc');
				informacionArregloConfGeneral[i].tipoContribuyenteIIBB = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_tipo_contribuyente');
				informacionArregloConfGeneral[i].porcentajeEspecialUtilizarBI = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_porc_espe_percep');
				informacionArregloConfGeneral[i].jurisdiccionSede = convertToBoolean(resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_calc_juris_sede'));
				informacionArregloConfGeneral[i].tipoContribuyenteIVA = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_tipo_cont_iva_perc');
				informacionArregloConfGeneral[i].importeMinPercepcion = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_imp_min_percepcion');
				informacionArregloConfGeneral[i].baseCalcAcumulada = convertToBoolean(resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_bas_calc_acumulada'));
				informacionArregloConfGeneral[i].calcularSobreNeto = convertToBoolean(resultadosConfDetalle[i].getValue('custrecord_l54_op_cal_im_re_pe_ca_im_net', 'custrecord_l54_pv_det_criterio_calculo'));
				informacionArregloConfGeneral[i].calcularSobreBruto = convertToBoolean(resultadosConfDetalle[i].getValue('custrecord_l54_op_cal_im_re_pe_ca_im_bru', 'custrecord_l54_pv_det_criterio_calculo'));
				informacionArregloConfGeneral[i].criterioPorcentajeEspecial = resultadosConfDetalle[i].getValue('custrecord_l54_codigo_criterio','custrecord_l54_pv_det_criterio_porct_per');
				informacionArregloConfGeneral[i].critJurisdUtilizacion = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_ve_uti_efe_cli_per');
				informacionArregloConfGeneral[i].critJurisdEntrega = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_ver_dire_entre_per');
				informacionArregloConfGeneral[i].critJurisdOrigen = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_ver_dir_orig_per');
				informacionArregloConfGeneral[i].critJurisdFacturacion = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_ver_dir_fac_per');
				informacionArregloConfGeneral[i].critJurisdEmpresa = resultadosConfDetalle[i].getValue('custrecord_l54_pv_det_ver_dir_cli_per');
			}
		}
	}
	return informacionArregloConfGeneral;
}

// MÃ©todo que me devuelve el Item y Codigo de Impuesto A Utilizar en los Impuestos Internos.
function obtenerConfImpuestoInterno(subsidiaria) {

	var resultadoConfImpInterno = new Object();
	resultadoConfImpInterno.idConfGeneral = 0;
	resultadoConfImpInterno.idArticuloImpInt = 0;
	resultadoConfImpInterno.idCodigoImpuesto = 0;
	resultadoConfImpInterno.confGeneralDefinida = false;

	var filtroConfImpInt = new Array();
	filtroConfImpInt[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	if (!isEmpty(subsidiaria))
		filtroConfImpInt[1] = new nlobjSearchFilter('custrecord_3k_panel_conf_imp_int_sub', null, 'is', subsidiaria);
	var columnaConfImpInt = new Array();
	columnaConfImpInt[0] = new nlobjSearchColumn('internalid');
	columnaConfImpInt[1] = new nlobjSearchColumn('custrecord_3k_panel_conf_imp_int_art');
	columnaConfImpInt[2] = new nlobjSearchColumn('custrecord_3k_panel_conf_imp_int_imp');
	columnaConfImpInt[3] = new nlobjSearchColumn('rate', 'custrecord_3k_panel_conf_imp_int_imp');

	var resultadosConfImpInt = new nlapiSearchRecord("customrecord_3k_panel_conf_imp_int", null, filtroConfImpInt, columnaConfImpInt);

	if (resultadosConfImpInt != null && resultadosConfImpInt.length > 0) {
		resultadoConfImpInterno.confGeneralDefinida = true;
		resultadoConfImpInterno.idConfGeneral = resultadosConfImpInt[0].getValue('internalid');
		resultadoConfImpInterno.idArticuloImpInt = resultadosConfImpInt[0].getValue('custrecord_3k_panel_conf_imp_int_art');
		resultadoConfImpInterno.idCodigoImpuesto = resultadosConfImpInt[0].getValue('custrecord_3k_panel_conf_imp_int_imp');
		resultadoConfImpInterno.porcCodigoImpuesto = resultadosConfImpInt[0].getValue('rate', 'custrecord_3k_panel_conf_imp_int_imp');
	}
	return resultadoConfImpInterno;

}

function obtenerInfoJurisdEntrega(arrayCodigosJurisdiccion) {

	nlapiLogExecution('DEBUG', 'obtenerInfoJurisdEntrega', 'INICIO - obtenerInfoJurisdEntrega - arrayCodigosJurisdiccion: ' + JSON.stringify(arrayCodigosJurisdiccion));
	var arrayInfoJurisdiccion = [];
	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	new nlobjSearchFilter('internalid', null, 'anyof', arrayCodigosJurisdiccion)];

	var columns = [
		new nlobjSearchColumn('internalid'),
		new nlobjSearchColumn('name'),
		new nlobjSearchColumn('custrecord_l54_zona_impuestos_codigo'),
		new nlobjSearchColumn('custrecord_l54_zona_im_apli_ca_ju_ent_pe'),
		new nlobjSearchColumn('custrecord_l54_zona_imp_cal_per_jur_insc')
	];

	var results = nlapiSearchRecord('customrecord_l54_zona_impuestos', null, filters, columns);

	if (!isEmpty(results) && results.length > 0) {
		for (var i = 0; i < results.length; i++) {
			var objInfoJurisdiccion = {};
			objInfoJurisdiccion.internalid = results[i].getValue('internalid');
			objInfoJurisdiccion.jurisdiccionDireccionEntregaText = results[i].getValue('name');
			objInfoJurisdiccion.codigoJurisdiccion = results[i].getValue('custrecord_l54_zona_impuestos_codigo');
			objInfoJurisdiccion.calcPerNoInscJurEnt = convertToBoolean(results[i].getValue('custrecord_l54_zona_im_apli_ca_ju_ent_pe'));
			objInfoJurisdiccion.aplicaCalcPercPorInscrip = convertToBoolean(results[i].getValue('custrecord_l54_zona_imp_cal_per_jur_insc'));
			arrayInfoJurisdiccion.push(objInfoJurisdiccion);
		}
	}

	nlapiLogExecution('DEBUG', 'obtenerInfoJurisdEntrega', 'arrayInfoJurisdiccion: ' + JSON.stringify(arrayInfoJurisdiccion));
	nlapiLogExecution('DEBUG', 'obtenerInfoJurisdEntrega', 'FIN - obtenerInfoJurisdEntrega');
	return arrayInfoJurisdiccion;
}

function convertToBoolean(string) {

	return ((isEmpty(string) || string == 'F' || string == false) ? false : true);
}

function obtenerInfoJurisdiccionesObligatorias(calcularPercepcionCABA, calcularPercepcionBUE, calcularPercepcionTUCUMAN) {

	nlapiLogExecution('DEBUG', 'obtenerInfoJurisdiccionesObligatorias', 'INICIO - obtenerInfoJurisdiccionesObligatorias - calcularPercepcionCABA: ' + calcularPercepcionCABA + ' - calcularPercepcionBUE: ' + calcularPercepcionBUE + ' - calcularPercepcionTUCUMAN: ' + calcularPercepcionTUCUMAN);
	var arrayInfoJurisdiccionObligatoria = [];

	if ((!isEmpty(calcularPercepcionCABA) && (calcularPercepcionCABA == 'T')) || (!isEmpty(calcularPercepcionBUE) && (calcularPercepcionBUE == 'T')) || (!isEmpty(calcularPercepcionTUCUMAN) && (calcularPercepcionTUCUMAN == 'T'))) {
		var filters = [];
		filters.push(['isinactive', 'is', 'F']);
		filters.push('and');

		if (!isEmpty(calcularPercepcionCABA) && (calcularPercepcionCABA == 'T')) {
			filters.push(['custrecord_l54_zona_impuestos_codigo', 'is', '901']);
		}

		if (!isEmpty(calcularPercepcionBUE) && (calcularPercepcionBUE == 'T')) {
			if (filters[filters.length - 1] == 'and') {
				filters.push(['custrecord_l54_zona_impuestos_codigo', 'is', '902']);
			} else {
				filters.push('or');
				filters.push(['custrecord_l54_zona_impuestos_codigo', 'is', '902']);
			}
		}

		if (!isEmpty(calcularPercepcionTUCUMAN) && (calcularPercepcionTUCUMAN == 'T')) {
			if (filters[filters.length - 1] == 'and') {
				filters.push(['custrecord_l54_zona_impuestos_codigo', 'is', '924']);
			} else {
				filters.push('or');
				filters.push(['custrecord_l54_zona_impuestos_codigo', 'is', '924']);
			}
		}

		var columns = [
			new nlobjSearchColumn('internalid'),
			new nlobjSearchColumn('name'),
			new nlobjSearchColumn('custrecord_l54_zona_impuestos_codigo'),
			new nlobjSearchColumn('custrecord_l54_zona_imp_cal_per_jur_insc')
		];

		var results = nlapiSearchRecord('customrecord_l54_zona_impuestos', null, filters, columns);

		if (!isEmpty(results) && results.length > 0) {
			for (var i = 0; i < results.length; i++) {
				var objInfoJurisdiccion = {};
				objInfoJurisdiccion.internalid = results[i].getValue('internalid');
				objInfoJurisdiccion.name = results[i].getValue('name');
				objInfoJurisdiccion.codigoJurisdiccion = results[i].getValue('custrecord_l54_zona_impuestos_codigo');
				objInfoJurisdiccion.esPercPadron = true; // INDICA QUE ES UNA PERCEPCION QUE SE CALCULA POR PADRON SIEMPRE Y CUANDO TENGA LA CONFIGURACIÓN
				objInfoJurisdiccion.aplicaCalcPercPorInscrip = convertToBoolean(results[i].getValue('custrecord_l54_zona_imp_cal_per_jur_insc'));
				arrayInfoJurisdiccionObligatoria.push(objInfoJurisdiccion);
			}
		}
	}

	nlapiLogExecution('DEBUG', 'obtenerInfoJurisdiccionesObligatorias', 'arrayInfoJurisdiccionObligatoria: ' + JSON.stringify(arrayInfoJurisdiccionObligatoria));
	nlapiLogExecution('DEBUG', 'obtenerInfoJurisdiccionesObligatorias', 'FIN - obtenerInfoJurisdiccionesObligatorias');
	return arrayInfoJurisdiccionObligatoria;
}

function getDate(fecha, zonaHoraria) { //Toma una fecha ubicada en otra zona horaria y la mueve a GMT0. Con zonaHoraria se puede cambiar por otra diferente a GMT0
	var utc = new Date(fecha); //GMT 0   
	zonaHoraria = isEmpty(zonaHoraria) ? 0 : zonaHoraria;
	utc = utc.getTime() + (utc.getTimezoneOffset() * 60000);
	return new Date(utc + (3600000 * zonaHoraria));
}


function getCompanyDate(fecha) {
	var currentDateTime = new Date(fecha);
	var companyTimeZone = nlapiLoadConfiguration('companyinformation').getFieldText('timezone');
	var timeZoneOffSet = (companyTimeZone.indexOf('(GMT)') == 0) ? 0 : new Number(companyTimeZone.substr(4, 6).replace(/\+|:00/gi, '').replace(/:30/gi, '.5'));
	var UTC = currentDateTime.getTime() + (currentDateTime.getTimezoneOffset() * 60000);
	var companyDateTime = UTC + (timeZoneOffSet * 60 * 60 * 1000);

	return new Date(companyDateTime);
}