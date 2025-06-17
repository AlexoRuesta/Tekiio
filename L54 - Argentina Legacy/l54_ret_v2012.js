// 20/09/2011 --- se agrego el manejo de los cod. de retencion para ganancias y suss en los pagos de FC de proveedor
// 20/09/2011 --- se agrego la funcion getDescRet() para obtener la desc. en los pagos de FC de proveedor
// 22/02/2013 --- PC: modificaciones para "optimizar" el calculo de retencion de ganancias que NetSuite lo está cortando
// 16/10/2013 --- PC: Ajuste en el tamaño del logo / Parametrizar Resolución Texto en lugar de un valor fijo
// 22/05/2014 --- Se pasaron los Importes de Retencions,Netos a Abonar y Bill a Moneda de Transaccion y Impresion de PDF en $ (PESOS)
// 29/01/2015 --- FDS1: Se modificaron las llamadas a los SS de calculo de retenciones, para que tenga en cuenta subsidiaria.
// 13/03/2015 --- FDS2: Se corrigió el problema del calculo de retenciones de ganancias. No estaba acumalando los pagos del mes (que no
//				  tuvieron retenciones), para el calculo del importe a retener.
// -------------------------------------------------------------------------------------------------------------

function isEmpty(value) {
	return value === '' || value === null || value === undefined || value === 'null' || value === 'undefined';
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


// -------------------------------------------------------------------------------------------------------------
// libs

function nullInBlank(value) {

	if (value == null || value == undefined)
		return '';

	return value;
}

function redondearV2(cantidad, decimales) {

	var cantidad = parseFloat(cantidad);
	var decimales = parseFloat(decimales);
	decimales = (!decimales ? 2 : decimales);

	return Math.round(cantidad * Math.pow(10, decimales)) / Math.pow(10, decimales);
}

function zeroFillV2(number, width) {

	width -= number.toString().length;
	if (width > 0) {

		return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
	}

	return number;
}

function formato_moneda(num, prefix) {

	prefix = prefix || '';
	num += '';
	var splitStr = num.split('.');
	var splitLeft = splitStr[0];
	var splitRight = splitStr.length > 1 ? ',' + splitStr[1] : '';
	var regx = /(\d+)(\d{3})/;
	while (regx.test(splitLeft)) {

		splitLeft = splitLeft.replace(regx, '$1' + '.' + '$2');
	}

	return prefix + splitLeft + splitRight;
}

function in_array(needle, haystack, argStrict) {

	// Checks if the given value exists in the array
	//
	// version: 911.718
	// discuss at: http://phpjs.org/functions/in_array    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// +   improved by: vlado houba
	// +   input by: Billy
	// +   bugfixed by: Brett Zamir (http://brett-zamir.me)
	// *     example 1: in_array('van', ['Kevin', 'van', 'Zonneveld']);    // *     returns 1: true
	// *     example 2: in_array('vlado', {0: 'Kevin', vlado: 'van', 1: 'Zonneveld'});
	// *     returns 2: false
	// *     example 3: in_array(1, ['1', '2', '3']);
	// *     returns 3: true    // *     example 3: in_array(1, ['1', '2', '3'], false);
	// *     returns 3: true
	// *     example 4: in_array(1, ['1', '2', '3'], true);
	// *     returns 4: false
	var key = '',
	strict = !!argStrict;
	if (strict) {
		for (key in haystack) {
			if (haystack[key] === needle) {
				return true;
			}
		}
	} else {
		for (key in haystack) {
			if (haystack[key] == needle) {
				return true;
			}
		}
	}

	return false;
}

// Método que me retorna el código de retención para el proveedor seleccionado y el tipo de retención
// Modificado 23/09/2014
function getCodigoRetencion(id_tipo_ret, id_proveedor) {

	// acá tengo que obtener el código de retención del proveedor
	var codigo_retencion = '';

	if (!isEmpty(id_proveedor) && !isEmpty(id_tipo_ret)) {

		var filters = [new nlobjSearchFilter('internalid', null, 'is', id_proveedor)];
		var columns = [new nlobjSearchColumn("custentity_l54_codigo_ret_" + id_tipo_ret)];

		var searchresults = new nlapiSearchRecord("vendor", null, filters, columns);

		for (var i = 0; searchresults != null && i < searchresults.length; i++)
			codigo_retencion = searchresults[i].getValue('custentity_l54_codigo_ret_' + id_tipo_ret);

	}

	return codigo_retencion;
}

// Método que me devuelve el identificador de la cuenta contable de la Compañia para un tipo de ret.
function getCuentaContableId(id_tipo_ret, subsidiaria) {

	var cuenta_contable_id = '';

	var columns = [new nlobjSearchColumn("custrecord_l54_cuenta_ret_" + id_tipo_ret)];

	var filters = new Array();
	if (!isEmpty(subsidiaria))
		filters[0] = new nlobjSearchFilter('custrecord_l54_subsidiaria', null, 'is', subsidiaria);

	var searchresults = null;
	if (!isEmpty(subsidiaria))
		searchresults = new nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, filters, columns);
	else
		searchresults = new nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, null, columns);

	for (var i = 0; searchresults != null && i < searchresults.length; i++)
		cuenta_contable_id = searchresults[i].getValue("custrecord_l54_cuenta_ret_" + id_tipo_ret);

	return cuenta_contable_id;
}

// Método que me devuelve true/false, indicando si la compañia es agente de retención del régimen enviado por parametro
function esAgenteRetencion(tipo_ret, subsidiaria) {

	var es_agente_retencion = 'F';

	var filters = new Array();
	filters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	if (!isEmpty(subsidiaria))
		filters[1] = new nlobjSearchFilter('custrecord_l54_subsidiaria', null, 'is', subsidiaria);
	var columns = [new nlobjSearchColumn('custrecord_l54_agente_retencion_' + tipo_ret)];

	var searchresults = new nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, filters, columns);

	for (var i = 0; searchresults != null && i < searchresults.length; i++) {

		// ver si esta seleccionado el parametro
		es_agente_retencion = searchresults[i].getValue('custrecord_l54_agente_retencion_' + tipo_ret);
	}

	if (!isEmpty(es_agente_retencion) && es_agente_retencion == 'T')
		return true;
	else
		return false;

}


// Método correspondiente al botón "Cancelar Retenciones" que se encuentra en los Pagos a Proveedores
function cancelarRetenciones() {

	if (confirm('Esta a punto de cancelar las retenciones generadas actualmente, desea continuar?')) {

		var recId = nlapiGetRecordId();

		// valido que se este en la creación del pago
		if (!isEmpty(recId)) {

			alert('Los importes de retención ya fueron calculados para este pago. Por favor verifique.');
			return false;
		}

		cantidadRetenciones = nlapiGetLineItemCount('custpage_sublist_retenciones');
		for (var i = cantidadRetenciones; i > 0; i--) {
			nlapiSelectLineItem('custpage_sublist_retenciones', i);
			nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_sistema_eliminar', 'T', true, true);
			nlapiCommitLineItem('custpage_sublist_retenciones');
			nlapiRemoveLineItem('custpage_sublist_retenciones', i);
		}

		// limpio datos cargados en la solapa 'Localizaciones'
		nlapiSetFieldValue('custbody_l54_gan_imp_a_retener', 0.00);
		nlapiSetFieldValue('custbody_l54_suss_imp_a_retener', 0.00);
		nlapiSetFieldValue('custbody_l54_iva_imp_a_retener', 0.00);
		nlapiSetFieldValue('custbody_l54_iibb_imp_a_retener', 0.00);
		nlapiSetFieldValue('custbody_l54_importe_total_retencion', 0.00);
		nlapiSetFieldValue('custbody_l54_base_calculo_ret_gan', 0.00);
		nlapiSetFieldValue('custbody_l54_base_calculo_ret_suss', 0.00);
		nlapiSetFieldValue('custbody_l54_base_calculo_ret_iva', 0.00);
		nlapiSetFieldValue('custbody_l54_base_calculo_ret_iibb', 0.00);
		nlapiSetFieldValue('custbody_l54_importe_iva', 0.00);
		nlapiSetFieldValue('custbody_l54_importe_percepciones', 0.00);

		alert('El proceso de cancelación de retenciones finalizo correctamente.');
	}
}

//FDS1: Se agrega el parametro Subsidiaria
function obtener_arreglo_netos_vendorbill(entidad, billsPagar, subsidiaria) {
	// obtengo la matriz de ID VENDOR BILL || NETO usando el SS "customsearch_l54_bill_net_amt"
	var columns = [new nlobjSearchColumn('internalid', null, 'group'),
		new nlobjSearchColumn('formulacurrency', null, 'sum')];
	var filters = new Array();
	//filters[0] = new nlobjSearchFilter('entity', null, 'is', entidad);
	filters[0] = new nlobjSearchFilter('internalid', null, 'anyof', billsPagar);
	filters[1] = new nlobjSearchFilter('formulanumeric', null, 'equalto', entidad);
	var sFormula='{vendor.internalid}';
	filters[1].setFormula(sFormula);
	/*FDS1** inicio*/
	if (!isEmpty(subsidiaria))
		filters[2] = new nlobjSearchFilter('subsidiary', null, 'is', subsidiaria);
	/*FDS1** Fin*/


	console.log("DEBUG" + 'LINE 237'+ "Bills: " + JSON.stringify(billsPagar)+ "Entidad :"+ entidad);

	var resultsNetosVB = new nlapiSearchRecord("transaction", "customsearch_l54_bill_net_amt", filters, columns);

	console.log("DEBUG"+ 'LINE 241'+ "resultsNetosVB: " + JSON.stringify(resultsNetosVB) );

	return resultsNetosVB;
}



function obtener_neto_vendorbill(arregloNetosVendorBill, idVendorBill) {

	var neto_vendorbill = 0;

	for (var i = 0; arregloNetosVendorBill != null && i < arregloNetosVendorBill.length; i++) {

		if (arregloNetosVendorBill[i].getValue('internalid', null, 'group') == parseInt(idVendorBill))
			return parseFloat(arregloNetosVendorBill[i].getValue('formulacurrency', null, 'sum'));
	}

	return neto_vendorbill;
}

function callBackRetenciones(response) {
	try {
		if (!isEmpty(response)) {
			var informacionRetenciones = JSON.parse(response.getBody());
			if (!isEmpty(informacionRetenciones)) {
				if (informacionRetenciones.error == false) {
					
					// Nuevo - Elimino Retenciones Previas de la Sublista de Retenciones Antes de Grabar la Sublista de Retenciones
					var cantidadRetenciones = nlapiGetLineItemCount('custpage_sublist_retenciones');
					for (var i = cantidadRetenciones; i > 0; i--) {
						nlapiSelectLineItem('custpage_sublist_retenciones', i);
						nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_sistema_eliminar', 'T', true, true);
						nlapiCommitLineItem('custpage_sublist_retenciones');
						nlapiRemoveLineItem('custpage_sublist_retenciones', i);
					}
					
					// limpio datos cargados en la solapa 'Localizaciones'
					nlapiSetFieldValue('custbody_l54_gan_imp_a_retener', 0.00);
					nlapiSetFieldValue('custbody_l54_suss_imp_a_retener', 0.00);
					nlapiSetFieldValue('custbody_l54_iva_imp_a_retener', 0.00);
					nlapiSetFieldValue('custbody_l54_iibb_imp_a_retener', 0.00);
					nlapiSetFieldValue('custbody_l54_importe_total_retencion', 0.00);
					nlapiSetFieldValue('custbody_l54_base_calculo_ret_gan', 0.00);
					nlapiSetFieldValue('custbody_l54_base_calculo_ret_suss', 0.00);
					nlapiSetFieldValue('custbody_l54_base_calculo_ret_iva', 0.00);
					nlapiSetFieldValue('custbody_l54_base_calculo_ret_iibb', 0.00);
					nlapiSetFieldValue('custbody_l54_importe_iva', 0.00);
					nlapiSetFieldValue('custbody_l54_importe_percepciones', 0.00);
					
					// Grabo Informacion de las Retenciones en el Pago
					// Solo si la compania es Agente de Retención del regimen y si el proveedor esta inscripto al regimen
					if (informacionRetenciones.esAgenteRetencionGan) {

						if (informacionRetenciones.estaInscriptoRegimenGan) {

							for (var i = 0; informacionRetenciones.retencion_ganancias != null && i < informacionRetenciones.retencion_ganancias.length; i++) {

								nlapiSelectNewLineItem('custpage_sublist_retenciones');

								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_retencion', informacionRetenciones.retencion_ganancias[i].retencion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_tipo_ret', informacionRetenciones.retencion_ganancias[i].tipo_ret, true, true);
								if(!isEmpty(informacionRetenciones.retencion_ganancias[i].alicuota) && !isNaN(informacionRetenciones.retencion_ganancias[i].alicuota) && parseFloat(informacionRetenciones.retencion_ganancias[i].alicuota,10)>0.00){
									var alicuotaRet=parseFloat(informacionRetenciones.retencion_ganancias[i].alicuota,10);
									nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_porcentaje', alicuotaRet, true, true);
								}
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_condicion', informacionRetenciones.retencion_ganancias[i].condicion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_net_bill', informacionRetenciones.retencion_ganancias[i].neto_bill, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo', informacionRetenciones.retencion_ganancias[i].base_calculo, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo_imp', informacionRetenciones.retencion_ganancias[i].base_calculo_imp, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_imp_a_retener', informacionRetenciones.retencion_ganancias[i].imp_retencion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_sistema_insertar', 'T', true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_sistema_eliminar', 'F', true, true);
								
								nlapiCommitLineItem('custpage_sublist_retenciones');

							}
							nlapiSetFieldValue('custbody_l54_gan_imp_a_retener', informacionRetenciones.imp_retencion_ganancias, false);

						}
					}

					if (informacionRetenciones.esAgenteRetencionSUSS) {

						if (informacionRetenciones.estaInscriptoRegimenSUSS) {

							for (var i = 0; informacionRetenciones.retencion_suss != null && i < informacionRetenciones.retencion_suss.length; i++) {

								nlapiSelectNewLineItem('custpage_sublist_retenciones');
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_retencion', informacionRetenciones.retencion_suss[i].retencion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_tipo_ret', informacionRetenciones.retencion_suss[i].tipo_ret, true, true);
								if(!isEmpty(informacionRetenciones.retencion_suss[i].alicuota) && !isNaN(informacionRetenciones.retencion_suss[i].alicuota) && parseFloat(informacionRetenciones.retencion_suss[i].alicuota,10)>0.00){
									var alicuotaRet=parseFloat(informacionRetenciones.retencion_suss[i].alicuota,10);
									nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_porcentaje', alicuotaRet, true, true);
								}
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_condicion', informacionRetenciones.retencion_suss[i].condicion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_net_bill', informacionRetenciones.retencion_suss[i].neto_bill, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo', informacionRetenciones.retencion_suss[i].base_calculo, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo_imp', informacionRetenciones.retencion_suss[i].base_calculo_imp, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_imp_a_retener', informacionRetenciones.retencion_suss[i].imp_retencion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_sistema_insertar', 'T', true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_sistema_eliminar', 'F', true, true);
								nlapiCommitLineItem('custpage_sublist_retenciones');

							}

							nlapiSetFieldValue('custbody_l54_suss_imp_a_retener', informacionRetenciones.imp_retencion_suss, false);

						}
					}

					if (informacionRetenciones.esAgenteRetencionIVA) {

						if (informacionRetenciones.estaInscriptoRegimenIVA) {

							for (var i = 0; informacionRetenciones.retencion_iva != null && i < informacionRetenciones.retencion_iva.length; i++) {

								nlapiSelectNewLineItem('custpage_sublist_retenciones');
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_retencion', informacionRetenciones.retencion_iva[i].retencion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_tipo_ret', informacionRetenciones.retencion_iva[i].tipo_ret, true, true);
								if(!isEmpty(informacionRetenciones.retencion_iva[i].alicuota) && !isNaN(informacionRetenciones.retencion_iva[i].alicuota) && parseFloat(informacionRetenciones.retencion_iva[i].alicuota,10)>0.00){
									var alicuotaRet=parseFloat(informacionRetenciones.retencion_iva[i].alicuota,10);
									nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_porcentaje', alicuotaRet, true, true);
								}
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_condicion', informacionRetenciones.retencion_iva[i].condicion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_net_bill', informacionRetenciones.retencion_iva[i].neto_bill, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo', informacionRetenciones.retencion_iva[i].base_calculo, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo_imp', informacionRetenciones.retencion_iva[i].base_calculo_imp, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_imp_a_retener', informacionRetenciones.retencion_iva[i].imp_retencion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_sistema_insertar', 'T', true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_sistema_eliminar', 'F', true, true);
								nlapiCommitLineItem('custpage_sublist_retenciones');

							}

							nlapiSetFieldValue('custbody_l54_iva_imp_a_retener', informacionRetenciones.imp_retencion_iva, false);

						}
					}

					if (informacionRetenciones.esAgenteRetencionIIBB) {

						if (informacionRetenciones.estaInscriptoRegimenIIBB) {

							for (var i = 0; informacionRetenciones.retencion_iibb != null && i < informacionRetenciones.retencion_iibb.length; i++) {

								nlapiSelectNewLineItem('custpage_sublist_retenciones');
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_retencion', informacionRetenciones.retencion_iibb[i].retencion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_tipo_ret', informacionRetenciones.retencion_iibb[i].tipo_ret, true, true);
								if(!isEmpty(informacionRetenciones.retencion_iibb[i].alicuota) && !isNaN(informacionRetenciones.retencion_iibb[i].alicuota) && parseFloat(informacionRetenciones.retencion_iibb[i].alicuota,10)>0.00){
									var alicuotaRet=parseFloat(informacionRetenciones.retencion_iibb[i].alicuota,10);
									nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_porcentaje', alicuotaRet, true, true);
								}
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_jurisdiccion', informacionRetenciones.retencion_iibb[i].jurisdiccion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_condicion', informacionRetenciones.retencion_iibb[i].condicion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_net_bill', informacionRetenciones.retencion_iibb[i].neto_bill, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo', informacionRetenciones.retencion_iibb[i].base_calculo, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo_imp', informacionRetenciones.retencion_iibb[i].base_calculo_imp, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_imp_a_retener', informacionRetenciones.retencion_iibb[i].imp_retencion, true, true);
								// Nuevo - ID de Tipo Contribuyente
								if(!isEmpty(informacionRetenciones.retencion_iibb[i].condicionID))
									nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_id_tipo_contr', informacionRetenciones.retencion_iibb[i].condicionID, true, true);
								
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_id_tipo_exen', informacionRetenciones.retencion_iibb[i].tipoExencion, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_cert_exen', informacionRetenciones.retencion_iibb[i].certExencion, true, true);
								var fechaExencion=informacionRetenciones.retencion_iibb[i].fcaducidadExencion;
								
								if(!isEmpty(fechaExencion)){
									var fechaExencionDate=nlapiStringToDate(fechaExencion);
									
									if(!isEmpty(fechaExencionDate)){
										var fechaExencionString = nlapiDateToString(fechaExencionDate,'date');
										nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_fecha_exen', fechaExencionString, true, true);
									}
								}
								
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_sistema_insertar', 'T', true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_sistema_eliminar', 'F', true, true);
								//NUEVO - DATOS IMPORTES ARCIBA
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_diferencia_redondeo', informacionRetenciones.retencion_iibb[i].diferenciaRedondeo, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_importe_ret_original', informacionRetenciones.retencion_iibb[i].imp_retencion_original, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo_original', informacionRetenciones.retencion_iibb[i].base_calculo_original, true, true);
								nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_monto_suj_ret_mon_loc', informacionRetenciones.retencion_iibb[i].monto_suj_ret_moneda_local, true, true);
								nlapiCommitLineItem('custpage_sublist_retenciones');

							}

							nlapiSetFieldValue('custbody_l54_iibb_imp_a_retener', informacionRetenciones.imp_retencion_iibb, false);

						}
					}

					nlapiSetFieldValue('custbody_l54_importe_neto_a_abonar', informacionRetenciones.importe_neto_a_abonar, false);
					nlapiSetFieldValue('custbody_l54_neto_bill_aplicados', informacionRetenciones.neto_bill_aplicados, false);
					nlapiSetFieldValue('custbody_l54_importe_total_retencion', informacionRetenciones.importe_total_retencion, false);

					// Para TXT de Retenciones
					nlapiSetFieldValue('custbody_l54_importe_iva', informacionRetenciones.importe_iva, false);
					nlapiSetFieldValue('custbody_l54_importe_percepciones', informacionRetenciones.importe_percepciones, false);

					// Guardo la Fecha de la Version para saber a que funcion de Imprimir PDF de Retenciones Utilizar
					// si el Pago a Proveedor no tiene configurado este campo con la fecha o es otra fecha no es esta version

					nlapiSetFieldValue('custbody_l54_version_calc_ret', informacionRetenciones.version_calc_ret, false);
					//

					/*if(informacionRetenciones.warning==false){
					// Muestro Mensaje OK
					alert(informacionRetenciones.mensajeOk);
					}
					else{
					// Muestro Mensajes de Warning
					for(var i=0 ; informacionRetenciones.mensajeWarning!=null && i<informacionRetenciones.mensajeWarning.length ; i++){
					alert(informacionRetenciones.mensajeWarning);
					}
					}*/
					var mensajeWarning='Aviso : \n ';
					if (informacionRetenciones.warning == true) {
						for (var i = 0; informacionRetenciones.mensajeWarning != null && i < informacionRetenciones.mensajeWarning.length; i++) {
							//alert(informacionRetenciones.mensajeWarning[i]);
							mensajeWarning+=((i+1) + ' - ' + informacionRetenciones.mensajeWarning[i] + '\n');							
						}
						alert(mensajeWarning);
					}

					// Muestro el Mensaje de Finalizacion
					alert(informacionRetenciones.mensajeOk);

				} else {
					// Muestro el Error
					var erroresCalculoRetenciones = "";
					if (informacionRetenciones.mensajeError != null && i < informacionRetenciones.mensajeError.length == 1) {
						erroresCalculoRetenciones = informacionRetenciones.mensajeError[0];
					} else {
						for (var i = 0; informacionRetenciones.mensajeError != null && i < informacionRetenciones.mensajeError.length; i++) {
							erroresCalculoRetenciones += informacionRetenciones.mensajeError[i] + " / ";
						}
					}

					console.log("Errores en libreria RET: " + erroresCalculoRetenciones);

					alert(erroresCalculoRetenciones);
				}
			} else {
				alert("Error Obteniendo Informacion de Calculo de Retenciones");
			}

		} else {
			alert("Error Obteniendo Informacion de Calculo de Retenciones");

		}
	} catch (err) {
		alert("Error Calulando Retenciones , Error : " + err.message);
	}
}

// Método correspondiente al botón "Calcular retenciones" que se encuentra en el Pago a Proveedores
function calcularRetenciones() {
	var informacionPago = new Object();
	if (confirm('El proceso de cálculo de retenciones puede demorar unos segundos, desea continuar ?')) {

		var cantidadRetenciones = nlapiGetLineItemCount('custpage_sublist_retenciones');
		for (var i = cantidadRetenciones; i > 0; i--) {
			nlapiSelectLineItem('custpage_sublist_retenciones', i);
			nlapiSetCurrentLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_sistema_eliminar', 'T', true, true);
			nlapiCommitLineItem('custpage_sublist_retenciones');
			nlapiRemoveLineItem('custpage_sublist_retenciones', i);
		}

		// Obtengo Informaicon del Pago
		var entity = nlapiGetFieldValue('entity');
		var id_posting_period = nlapiGetFieldValue('postingperiod');
		var tasa_cambio_pago = nlapiGetFieldValue('exchangerate');
		var total = nlapiGetFieldValue('total');
		var trandate = nlapiGetFieldValue('trandate');
		var moneda = nlapiGetFieldValue('currency');

		var subsidiariaPago = null;
		var esOneWorld = esOneworld();
		if (esOneWorld)
			subsidiariaPago = nlapiGetFieldValue('subsidiary');

		informacionPago.entity = entity;
		informacionPago.periodo = id_posting_period;
		informacionPago.tipoCambio = tasa_cambio_pago;
		informacionPago.importeTotal = total;
		informacionPago.fecha = trandate;
		// Nuevo para el manejo de Formatos de Fechas
		informacionPago.fecha = nlapiStringToDate(informacionPago.fecha);
		informacionPago.moneda = moneda;
		informacionPago.subsidiaria = subsidiariaPago;
		informacionPago.esOneWorld = esOneWorld;
		informacionPago.facturas = new Array();
		
		if(!isEmpty(total) && total>0.00){

			// Obtengo la Informacion de las Facturas A Pagar
			var contadorFacturas = 0;
			for (var i = 1; i <= nlapiGetLineItemCount('apply'); i++) {
				if (nlapiGetLineItemValue('apply', 'apply', i) == "T") {
					var id_vendorbill = nlapiGetLineItemValue('apply', 'doc', i);
					var amount = nlapiGetLineItemValue('apply', 'amount', i)
						informacionPago.facturas[contadorFacturas] = new Object();
					informacionPago.facturas[contadorFacturas].idVendorBill = id_vendorbill;
					informacionPago.facturas[contadorFacturas].linea = i;
					informacionPago.facturas[contadorFacturas].amount = amount;
					contadorFacturas = parseInt(contadorFacturas, 10) + parseInt(1, 10);
				}
			}

			var objInformacionPago = new Array();

			var informacionPagoJson = JSON.stringify(informacionPago);
			objInformacionPago['informacionPago'] = informacionPagoJson;

			// Llamo a Suitelet Para el Calculo de las Retenciones
			try {
				//alert('Se invoca: '+datosEnviar['idFrecuencia']+','+datosEnviar['idPlan']+','+datosEnviar['esPedidoPuntual']+','+datosEnviar['idCliente']+','+datosEnviar['recType']+','+datosEnviar['fechaAnclaje']);

				var strURL = nlapiResolveURL('SUITELET', 'customscript_l54_calc_retencion_compras', 'customdeploy_l54_calc_retencion_compras');
				var objRta = nlapiRequestURL(strURL, objInformacionPago, null, callBackRetenciones, null);
				//var objRta = nlapiRequestURL(strURL, objInformacionPago, null, null, null);
				//var informacionRetenciones = JSON.parse(objRta.getBody());
				//alert("Informacion Retencion : " + informacionRetenciones);
			} catch (err) {
				alert('Error Calculando Retenciones: ' + err.message);
			}
			/*var context = nlapiGetContext();
			var unidadesDisponibles = context.getRemainingUsage();
			alert("Unidades Disponibles : " + unidadesDisponibles);*/
	}
	else{
		// NUEVO - limpio datos cargados en la solapa 'Localizaciones'
		nlapiSetFieldValue('custbody_l54_gan_imp_a_retener', 0.00);
		nlapiSetFieldValue('custbody_l54_suss_imp_a_retener', 0.00);
		nlapiSetFieldValue('custbody_l54_iva_imp_a_retener', 0.00);
		nlapiSetFieldValue('custbody_l54_iibb_imp_a_retener', 0.00);
		nlapiSetFieldValue('custbody_l54_importe_total_retencion', 0.00);
		nlapiSetFieldValue('custbody_l54_base_calculo_ret_gan', 0.00);
		nlapiSetFieldValue('custbody_l54_base_calculo_ret_suss', 0.00);
		nlapiSetFieldValue('custbody_l54_base_calculo_ret_iva', 0.00);
		nlapiSetFieldValue('custbody_l54_base_calculo_ret_iibb', 0.00);
		nlapiSetFieldValue('custbody_l54_importe_iva', 0.00);
		nlapiSetFieldValue('custbody_l54_importe_percepciones', 0.00);
		
		alert('No hay Retenciones A Generar');
	}

	}
}



function imprimirCheque() {

	var recId = nlapiGetRecordId();

	if (!isEmpty(recId)) {

		var record = nlapiLoadRecord('check', recId);
		var fechaImpresionCheque = record.getFieldValue('custbody_l54_fec_imp_cheque'); // Leandro ver

		if (!isEmpty(fechaImpresionCheque)) {

			var new_url = nlapiResolveURL('SUITELET', 'customscript_l54_cheque_pdf', 'customdeploy1');
			window.open(new_url + "&custparam_check=" + recId);
		} else
			alert('Este cheque ya fue impreso, por favor verifique y vuelva a intentar.');
	}
}

function getMesName(mes) {

	mes = parseInt(mes);

	if (mes == 1)
		return 'Enero';
	else if (mes == 2)
		return 'Febrero';
	else if (mes == 3)
		return 'Marzo';
	else if (mes == 4)
		return 'Abril';
	else if (mes == 5)
		return 'Mayo';
	else if (mes == 6)
		return 'Junio';
	else if (mes == 7)
		return 'Julio';
	else if (mes == 8)
		return 'Agosto';
	else if (mes == 9)
		return 'Septiembre';
	else if (mes == 10)
		return 'Octubre';
	else if (mes == 11)
		return 'Noviembre';
	else if (mes == 12)
		return 'Diciembre';
}

function chequeToPDF(request, response) {

	var checkId = request.getParameter('custparam_check');
	var record = nlapiLoadRecord('check', checkId); // Leandro ver
	var usertotal = record.getFieldValue('usertotal');
	var trandate = record.getFieldValue('trandate');
	var entity = record.getFieldText('entity');
	var montoEscrito = record.getFieldValue('custbody_l54_monto_escrito');

	var datePartes = trandate.split("/");
	mes = datePartes[0];
	dia = datePartes[1];
	ano = datePartes[2];

	var str = "<p padding-left='5in'>" + "******* " + formato_moneda(usertotal, '') + "</p>";
	str += "<p padding-left='2.5in'>" + zeroFillV2(parseInt(dia), 2) + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + getMesName(mes) + "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + ano + "</p>";
	str += "<p padding-left='2.5in'>" + entity + " ***********************" + "</p>";
	//str+= "<p padding-left='2.5in'>" + "********************************************" + "</p>";
	str += "<p padding-left='3in'>" + montoEscrito + " ****" + "</p>";
	str += "<p padding-left='3in'>" + " *********************************************" + "</p>";

	var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdf>\n<body margin=\"-0.4in\" font-size=\"10\">\n" + str + "\n</body>\n</pdf>";
	var file = nlapiXMLToPDF(xml);
	response.setContentType('PDF', 'cheque.pdf');
	response.write(file.getValue());
}

// Método que llama el onclick del botón 'Imprimir retenciones'
function imprimirRetenciones() {

	var recId = nlapiGetRecordId();

	if (!isEmpty(recId)) {

		// Aca Podria Preguntar si esOneworld y solicitar tambien el campo subsidiaria y enviarlo como parametro
		// window.open(new_url + "&custparam_vendorpayment=" + recId + "&custpara_subsidiary=" + subsidiaria);
		// para en el suitelet buscar los datos de la empresa en base a la subsidiaria
		var esOneWorld = esOneworld();
		if (esOneWorld)
			var fields = ['custbody_l54_ret_calculadas', 'custbody_l54_suss_imp_a_retener', 'custbody_l54_gan_imp_a_retener', 'custbody_l54_iibb_imp_a_retener', 'custbody_l54_iva_imp_a_retener', 'custbody_l54_ret_gan_numerador', 'custbody_l54_ret_suss_numerador', 'custbody_l54_ret_iva_numerador', 'custbody_l54_ret_iibb_numerador', 'custbody_l54_version_calc_ret', 'subsidiary'];
		else
			var fields = ['custbody_l54_ret_calculadas', 'custbody_l54_suss_imp_a_retener', 'custbody_l54_gan_imp_a_retener', 'custbody_l54_iibb_imp_a_retener', 'custbody_l54_iva_imp_a_retener', 'custbody_l54_ret_gan_numerador', 'custbody_l54_ret_suss_numerador', 'custbody_l54_ret_iva_numerador', 'custbody_l54_ret_iibb_numerador', 'custbody_l54_version_calc_ret'];

		var columns = nlapiLookupField('vendorpayment', recId, fields);

		var numerador_gan = columns.custbody_l54_ret_gan_numerador;
		var numerador_suss = columns.custbody_l54_ret_suss_numerador;
		var numerador_iva = columns.custbody_l54_ret_iva_numerador;
		var numerador_iibb = columns.custbody_l54_ret_iibb_numerador;
		var retencionesCalculadas = columns.custbody_l54_ret_calculadas;
		var impRetIVA = columns.custbody_l54_iva_imp_a_retener;
		var impRetSUSS = columns.custbody_l54_suss_imp_a_retener;
		var impRetGAN = columns.custbody_l54_gan_imp_a_retener;
		var impRetIIBB = columns.custbody_l54_iibb_imp_a_retener;

		var versionProcesoCalcRet = columns.custbody_l54_version_calc_ret;
		if (!isEmpty(versionProcesoCalcRet) && versionProcesoCalcRet == "2014")
			versionProcesoCalcRet = 1;
		else
			versionProcesoCalcRet = 0;

		var subsidiaria = ""
			if (esOneWorld) {
				subsidiaria = columns.subsidiary;
				if (isEmpty(subsidiaria))
					subsidiaria = "";
			} else {
				subsidiaria = "";
			}

			if (versionProcesoCalcRet == 1) {
				if (!isEmpty(retencionesCalculadas) && retencionesCalculadas == 'T'
					 && (!isEmpty(impRetIVA) && impRetIVA != 0.00
						 || !isEmpty(impRetSUSS) && impRetSUSS != 0.00
						 || !isEmpty(impRetGAN) && impRetGAN != 0.00
						 || !isEmpty(impRetIIBB) && impRetIIBB != 0.00)) {
					var new_url = nlapiResolveURL('SUITELET', 'customscript_l54_retencion_pdf', 'customdeploy1');
					window.open(new_url + "&custparam_vendorpayment=" + recId + "&custparam_subsidiary=" + subsidiaria + "&custparam_version=" + versionProcesoCalcRet + "&custparam_grabarret=1");
				} else {
					alert('No es posible imprimir las retenciones debido a que el pago no tiene retenciones generadas. Por favor verifique y vuelva a intentar.');
				}
			} else {
				if (!isEmpty(numerador_gan) || !isEmpty(numerador_suss) || !isEmpty(numerador_iva) || !isEmpty(numerador_iibb)) {
					var new_url = nlapiResolveURL('SUITELET', 'customscript_l54_retencion_pdf', 'customdeploy1');
					window.open(new_url + "&custparam_vendorpayment=" + recId + "&custparam_subsidiary=" + subsidiaria + "&custparam_version=" + versionProcesoCalcRet + "&custparam_grabarret=1");
				} else {
					alert('No es posible imprimir las retenciones debido a que el pago no tiene retenciones generadas. Por favor verifique y vuelva a intentar.');
				}
			}
	} else
		alert('Imposible realizar esta operación, debido a que las retenciones no fueron generadas.');
}



//FDS1: se agrega parámetro subsidiaria
function obtenerImportesRetencion(idsRetencion, idPago, subsidiaria) {
	var importeRetencion = 0.00;
	if (!isEmpty(idsRetencion)) {
		var filtro = new Array();
		filtro[0] = new nlobjSearchFilter('internalid', null, 'anyof', idsRetencion);
		if (idPago != null)
			filtro[1] = new nlobjSearchFilter('custrecord_l54_ret_ref_pago_prov', null, 'is', idPago);

		/*FDS1 **inicio**/
		if (!isEmpty(subsidiaria))
			filtro[2] = new nlobjSearchFilter('custrecord_l54_ret_subsidiaria', null, 'is', subsidiaria);
		/*FDS1 **fin**/

		var columna = new nlobjSearchColumn("custrecord_l54_ret_importe", null, "SUM");
		var resultado = new nlapiSearchRecord("customrecord_l54_retencion", "customsearch_l54_vendorpayment_imp_ret", filtro, columna);
		if (resultado != null && resultado.length > 0) {
			importeRetencion = resultado[0].getValue("custrecord_l54_ret_importe", null, "SUM");
		}
	}
	return importeRetencion;
}

/*
Funcion que recalcula los importes de las Retenciones cuando se modifican los valores de la sublista
 */
function actualizarImportesRetencion(type) {
	if (type == "custpage_sublist_retenciones") {
		// Recorro la Sublista de Retenciones y Actualizo los Importes de las retenciones
		cantidadRetenciones = nlapiGetLineItemCount('custpage_sublist_retenciones');
		var importeTotalGanancias = 0.00;
		var importeTotalSUSS = 0.00;
		var importeTotalIVA = 0.00;
		var importeTotalIIBB = 0.00;

		for (var i = 1; i <= cantidadRetenciones; i++) {

			var idTipoRetencion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_retencion', i);
			var importeRetener = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_imp_a_retener', i);

			if (idTipoRetencion == 1) {
				importeTotalGanancias = parseFloat(importeTotalGanancias, 10) + parseFloat(importeRetener, 10);
			} else {
				if (idTipoRetencion == 2) {
					importeTotalIVA = parseFloat(importeTotalIVA, 10) + parseFloat(importeRetener, 10);
				} else {
					if (idTipoRetencion == 3) {
						importeTotalIIBB = parseFloat(importeTotalIIBB, 10) + parseFloat(importeRetener, 10);
					} else {
						if (idTipoRetencion == 4) {
							importeTotalSUSS = parseFloat(importeTotalSUSS, 10) + parseFloat(importeRetener, 10);
						}

					}
				}
			}

		}
		// Configuro los Campos de Cabecera de Retenciones
		nlapiSetFieldValue('custbody_l54_gan_imp_a_retener', importeTotalGanancias);
		nlapiSetFieldValue('custbody_l54_suss_imp_a_retener', importeTotalSUSS);
		nlapiSetFieldValue('custbody_l54_iva_imp_a_retener', importeTotalIVA);
		nlapiSetFieldValue('custbody_l54_iibb_imp_a_retener', importeTotalIIBB);
		var importeTotalRetencion = parseFloat(importeTotalGanancias, 10) + parseFloat(importeTotalIVA, 10) + parseFloat(importeTotalIIBB, 10) + parseFloat(importeTotalSUSS, 10);
		nlapiSetFieldValue('custbody_l54_importe_total_retencion', importeTotalRetencion);
		var importeNetoAbonar = parseFloat(nlapiGetFieldValue('total'), 10) - parseFloat(importeTotalRetencion, 10);
		nlapiSetFieldValue('custbody_l54_importe_neto_a_abonar', importeNetoAbonar);
	}
	return true;
}

/*
Funcion que valida que el usuario no Agregue Nuevas Lineas de Retencion
 */
function agregarLineaRetencion(type) {
	var currentContext = nlapiGetContext();
	if (type == "custpage_sublist_retenciones") {
		if (nlapiGetCurrentLineItemValue(type, 'custrecord_l54_ret_sistema_insertar') == 'T') {
			return true;
		} else {
			//alert("Para Calcular Retenciones haga click en el Boton - Calcular Retenciones");
			nlapiCancelLineItem(type);
			//nlapiRefreshLineItems(type);
			return false;
		}
		//nlapiRefreshLineItems(type);
	}

	return true;
}

/*
Funcion que valida que el usuario no Elimine Lineas de Retencion
 */
function eliminarLineaRetencion(type) {
	var currentContext = nlapiGetContext();
	if (type == "custpage_sublist_retenciones") {
		if (nlapiGetCurrentLineItemValue(type, 'custrecord_l54_ret_sistema_eliminar') == 'T') {
			return true;
		} else {
			//alert("Para Eliminar las Retenciones haga click en el Boton - Eliminar Retenciones");
			//nlapiRefreshLineItems(type);
			return false;
		}

		//nlapiRefreshLineItems(type);
	}
	return true;
}

/*
Funcion que valida que el usuario no Agregue Nuevas Lineas de Retencion
 */
function insertarLineaRetencion(type) {
	var currentContext = nlapiGetContext();
	if (type == "custpage_sublist_retenciones") {
		return false;
	}
}

function validarJurisdiccionesIIBBProveedor() {

	var recId = nlapiGetRecordId();
	var recType = nlapiGetRecordType();

	var filters = new Array();

	filters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	var jurisdiccion = nlapiGetFieldValue('custrecord_l54_jurisdicciones_iibb_jur');
	var proveedor = nlapiGetFieldValue('custrecord_l54_jurisdicciones_iibb_prov');
	var proveedorTexto = nlapiGetFieldText('custrecord_l54_jurisdicciones_iibb_prov');
	var jurisdiccionTexto = nlapiGetFieldText('custrecord_l54_jurisdicciones_iibb_jur');
	var cliente = nlapiGetFieldValue('custrecord_l54_jurisdicciones_iibb_cli');
	var clienteTexto = nlapiGetFieldText('custrecord_l54_jurisdicciones_iibb_cli');

	if (!isEmpty(jurisdiccion) && (!isEmpty(proveedor) || !isEmpty(cliente))) {
		filters[1] = new nlobjSearchFilter('custrecord_l54_jurisdicciones_iibb_jur', null, 'is', jurisdiccion);
		
		if(!isEmpty(proveedor)){
			filters[2] = new nlobjSearchFilter('custrecord_l54_jurisdicciones_iibb_prov', null, 'is', proveedor);

			if (!isEmpty(recId))
				filters[3] = new nlobjSearchFilter('internalid', null, 'noneof', recId, null);

			var resultsProv = nlapiSearchRecord('customrecord_l54_jurisdicciones_iibb', null, filters, null);

			if (resultsProv != null && resultsProv.length > 0) {
				alert('Solo puede cargar una configuraci' + '\u00f3' + 'n para la Jurisdicci' + '\u00f3' + 'n ' + jurisdiccionTexto + ' asociada al Proveedor ' + proveedorTexto + ' en el Sistema. Verifique.');
				return false;
			}
		}
		if(!isEmpty(cliente)){
			filters[2] = new nlobjSearchFilter('custrecord_l54_jurisdicciones_iibb_cli', null, 'is', cliente);

			if (!isEmpty(recId))
				filters[3] = new nlobjSearchFilter('internalid', null, 'noneof', recId, null);

			var resultsCli = nlapiSearchRecord('customrecord_l54_jurisdicciones_iibb', null, filters, null);

			if (resultsCli != null && resultsCli.length > 0) {
				alert('Solo puede cargar una configuraci' + '\u00f3' + 'n para la Jurisdicci' + '\u00f3' + 'n ' + jurisdiccionTexto + ' asociada al Cliente ' + clienteTexto + ' en el Sistema. Verifique.');
				return false;
			}
		}
	} else {
		alert('Debe ingresar un Proveedor o Cliente y la Jurisdicci' + '\u00f3' + 'n correspondiente. Verifique.');
		return false;
	}

	return true;
}

function getInformacionRetencion(codigo_retencion) {

	var retencion = null;

	if (!isEmpty(codigo_retencion)) {

		var filters = [new nlobjSearchFilter('internalid', null, 'is', codigo_retencion),
			new nlobjSearchFilter('isinactive', null, 'is', 'F')];

		var columns = new Array();
		columns[0] = new nlobjSearchColumn('custrecord_l54_param_ret_cod_ret');
		columns[1] = new nlobjSearchColumn('custrecord_l54_param_ret_tipo_ret');
		columns[2] = new nlobjSearchColumn('custrecord_l54_param_ret_desc');

		var searchresults = new nlapiSearchRecord('customrecord_l54_param_ret', null, filters, columns);

		if (searchresults != null && searchresults.length > 0) {
			retencion = new Object();
			retencion.codigo = searchresults[0].getValue('custrecord_l54_param_ret_cod_ret');
			retencion.tipo = searchresults[0].getValue('custrecord_l54_param_ret_tipo_ret');
			retencion.descripcion = searchresults[0].getValue('custrecord_l54_param_ret_desc');
		}
	}
	return retencion;
}

function anularRetenciones(tipoRetGan, tipoRetIva, tipoRetIibb, tipoRetSuss, tipoTransacGanAnul, tipoTransacIvaAnul, tipoTransacIibbAnul, tipoTransacSussAnul, tipoRetMuni, tipoTransacMuniAnul, tipoRetInym, tipoTransacInymAnul){

	nlapiLogExecution('DEBUG', 'anularRetenciones()', 'OPEN');
	var recId 		    = nlapiGetRecordId();
	var recType 		= nlapiGetRecordType();
	var record_transac  = nlapiLoadRecord(recType,recId);
	var anuladoNS = record_transac.getFieldValue('voided') == 'T';
	var anuladoRet = record_transac.getFieldValue('custbody_l54_ret_anuladas') == 'T';	
	
	if(anuladoNS && !anuladoRet){
		//El pago está anulado y tilde no marcado
		alert('El pago está anulado a nivel de Netsuite. Por favor tildar el check RETENCIONES ANULADAS manualmente');
		return false
	}

	if (confirm('El proceso de anulación de retenciones puede demorar unos segundos, desea continuar ?')) {

		var recId   = nlapiGetRecordId();
		var recType = nlapiGetRecordType();

		if (!isEmpty(recId)){

			try {
					var filters = new nlobjSearchFilter('internalid', null, 'is', recId);
					var columns = new Array();
					columns[0] = new nlobjSearchColumn('recordtype');
					columns[1] = new nlobjSearchColumn('tranid');
					columns[2] = new nlobjSearchColumn('type');

					var searchresults = new nlapiSearchRecord('transaction', null, filters, columns);

					if (searchresults != null && searchresults.length > 0) {
						retencion = new Object();
						var recordType = searchresults[0].getValue('recordtype');
						var tranid = searchresults[0].getValue('tranid');
						var tipo = searchresults[0].getValue('type');

						if (recordType == "vendorpayment") {
							// Creo el Reverse del Asiento
							var registroCargado = false;
							try {
								var recordPagoProveedor = nlapiLoadRecord(recordType, recId);
								var recVoided = recordPagoProveedor.getFieldValue('voided');
								var recStatus = recordPagoProveedor.getFieldValue('status');
								var codigo_op = recordPagoProveedor.getFieldValue('custbody_l54_numero_localizado');
								var entity = recordPagoProveedor.getFieldValue('entity');
								var trandate = recordPagoProveedor.getFieldValue('trandate');
								var subsidiary = null;
								var esOneWorld = esOneworld();
								if (esOneWorld) {
									subsidiary = recordPagoProveedor.getFieldValue('subsidiary');
								}
								var esND = recordPagoProveedor.getFieldValue('custbody_l54_nd');
								var tasa_pago = recordPagoProveedor.getFieldValue('exchangerate');
								var numerador_manual = recordPagoProveedor.getFieldValue('custbody_l54_numerador_manual');
								var bocaId = recordPagoProveedor.getFieldValue("custbody_l54_boca");
								var letraId = recordPagoProveedor.getFieldValue("custbody_l54_letra");
								var moneda = recordPagoProveedor.getFieldValue('currency');
								var department = recordPagoProveedor.getFieldValue('department');
								var location = recordPagoProveedor.getFieldValue('location');
								var clase = recordPagoProveedor.getFieldValue('class');

								/** Cuenta Clearing */
								var ctaBancoAuxiliar = recordPagoProveedor.getFieldValue('custbody_l54_cuenta_banco');
								var retencionJournal = recordPagoProveedor.getFieldValue('custbody_l54_id_je_vendorpayment'); 
								
								var cuentaClearing = false;
								if (!isEmpty(ctaBancoAuxiliar) && !isEmpty(retencionJournal)) { // si se aplica clearing
									cuentaClearing = true;
								}
								nlapiLogExecution('DEBUG', 'Cuenta auxiliar', ctaBancoAuxiliar);
								var subsidiariaPago = null;
								var esOneWorld = esOneworld();
								if (esOneWorld)
									subsidiariaPago = subsidiary;

								var tipoTransStr = 'vendorpayment';
								// Defino identificadores para las cuentas contables
								var id_account = recordPagoProveedor.getFieldValue('account'); // cuenta contable original del pago
								var id_ret_ganancias = getCuentaContableId('gan', subsidiariaPago); // cuenta contable ganancias
								var id_ret_suss = getCuentaContableId('suss', subsidiariaPago); // cuenta contable SUSS
								var id_ret_iva = getCuentaContableId('iva', subsidiariaPago); // cuenta contable IVA
								//var id_ret_iibb = getCuentaContableId('iibb', subsidiariaPago); // cuenta contable IIBB

								var idsRetGanancia = recordPagoProveedor.getFieldValue("custbody_l54_id_ret_ganancias");
								var idsRetIVA = recordPagoProveedor.getFieldValue("custbody_l54_id_ret_iva");
								var idsRetIIBB = recordPagoProveedor.getFieldValue("custbody_l54_id_ret_iibb");
								var idsRetMuni = recordPagoProveedor.getFieldValue("custbody_l54_id_ret_muni");
								var idsRetInym = recordPagoProveedor.getFieldValue("custbody_l54_id_ret_inym");
								var idsRetSUSS = recordPagoProveedor.getFieldValue("custbody_l54_id_ret_suss");

								var monto_ret_ganancias = recordPagoProveedor.getFieldValue('custbody_l54_gan_imp_a_retener');
								if (isEmpty(monto_ret_ganancias) || isNaN(monto_ret_ganancias))
									monto_ret_ganancias = "0.00";
								var monto_ret_suss = recordPagoProveedor.getFieldValue('custbody_l54_suss_imp_a_retener');
								if (isEmpty(monto_ret_suss) || isNaN(monto_ret_suss))
									monto_ret_suss = "0.00";
								var monto_ret_iva = recordPagoProveedor.getFieldValue('custbody_l54_iva_imp_a_retener');
								if (isEmpty(monto_ret_iva) || isNaN(monto_ret_iva))
									monto_ret_iva = "0.00";
								var monto_ret_iibb = recordPagoProveedor.getFieldValue('custbody_l54_iibb_imp_a_retener');
								if (isEmpty(monto_ret_iibb) || isNaN(monto_ret_iibb))
									monto_ret_iibb = "0.00";
								var monto_ret_muni = recordPagoProveedor.getFieldValue('custbody_l54_municipal_imp_a_retener');
								if (isEmpty(monto_ret_muni) || isNaN(monto_ret_muni))
									monto_ret_muni = "0.00";
								var monto_ret_inym = recordPagoProveedor.getFieldValue('custbody_l54_inym_imp_a_retener');
								if (isEmpty(monto_ret_inym) || isNaN(monto_ret_inym))
									monto_ret_inym = "0.00";

								monto_ret_ganancias = parseFloat(monto_ret_ganancias, 10).toFixed(2);
								monto_ret_suss = parseFloat(monto_ret_suss, 10).toFixed(2);
								monto_ret_iva = parseFloat(monto_ret_iva, 10).toFixed(2);
								monto_ret_iibb = parseFloat(monto_ret_iibb, 10).toFixed(2);
								monto_ret_muni = parseFloat(monto_ret_muni, 10).toFixed(2);
								monto_ret_inym = parseFloat(monto_ret_inym, 10).toFixed(2);
								var monto_ret_total = (parseFloat(monto_ret_ganancias, 10) + parseFloat(monto_ret_suss, 10) + parseFloat(monto_ret_iva, 10) + parseFloat(monto_ret_iibb, 10) + parseFloat(monto_ret_muni, 10) + parseFloat(monto_ret_inym, 10));
								monto_ret_total = monto_ret_total.toFixed(2);
								
								if(cuentaClearing){
									var monto_retencicon = recordPagoProveedor.getFieldValue('custbody_l54_importe_neto_a_abonar');
									if (isEmpty(monto_retencicon) || isNaN(monto_retencicon))
										monto_retencicon = "0.00";
									monto_retencicon = parseFloat(monto_retencicon, 10).toFixed(2);
									monto_ret_total = (parseFloat(monto_ret_ganancias, 10) + parseFloat(monto_ret_suss, 10) + parseFloat(monto_ret_iva, 10) + parseFloat(monto_ret_iibb, 10) + parseFloat(monto_ret_muni, 10) + parseFloat(monto_ret_inym, 10)) + parseFloat(monto_retencicon, 10);
									monto_ret_total = monto_ret_total.toFixed(2);
								}

								
								registroCargado = true;
							} catch (e) {
								registroCargado = false;
								nlapiLogExecution('ERROR', 'Error Leyendo Pago a Proveedor', 'NetSuite error: ' + e.message);
							}


							if(isEmpty(tipoRetGan) || isEmpty(tipoRetIva) || isEmpty(tipoRetIibb) || isEmpty(tipoRetSuss) || isEmpty(tipoTransacGanAnul) || isEmpty(tipoTransacIvaAnul) || isEmpty(tipoTransacIibbAnul) || isEmpty(tipoTransacSussAnul) || isEmpty(tipoRetMuni) || isEmpty(tipoTransacMuniAnul) || isEmpty(tipoRetInym) || isEmpty(tipoTransacInymAnul)){
								alert('Revisar los Parametros de descpliegue del script L54 - Anular Retenciones');
							} else{

								var arrayTipoTransac = [tipoTransacGanAnul, tipoTransacIvaAnul, tipoTransacIibbAnul, tipoTransacSussAnul, tipoTransacMuniAnul, tipoTransacInymAnul];

								var numeradoresObtenidos = obtenerNumeradores(arrayTipoTransac, subsidiary, bocaId, letraId);

								var existenErroresNumAnulacion = false;
								//nlapiGetAllLineItems()
								//log.debug('Anulacion Retenciones', 'Sublistas: ' + recordPagoProveedor.nlapiGetAllLineItems());
								var cantidadRet = recordPagoProveedor.getLineItemCount('recmachcustrecord_l54_ret_ref_pago_prov');
								/* valido/verifico si existen numeradores de anulacion para las retenciones generadas con la sublista:
								
								recmachcustrecord_l54_ret_ref_pago_prov, recorrerla y obtener los valores que necesites*/
								//log.debug('Anulacion Retenciones', 'Cantidad de retenciones: ' + cantidadRet);
								nlapiLogExecution('DEBUG', 'Anulacion Retenciones','Cantidad de retenciones: ' + cantidadRet);
								
								if (!isEmpty(cantidadRet) && cantidadRet > 0) {
									nlapiLogExecution('DEBUG', 'Anulacion Retenciones','Entre a la validacion de cantidad de retenciones');

									for (var j = 1; !existenErroresNumAnulacion && j <= cantidadRet; j++) {
										//nlapiLogExecution('DEBUG', 'Anulacion Retenciones','Entre al for ' + j);
										var tipoRetencion = recordPagoProveedor.getLineItemValue('recmachcustrecord_l54_ret_ref_pago_prov', 'custrecord_l54_ret_tipo', j);
										var jurisdiccion = recordPagoProveedor.getLineItemValue('recmachcustrecord_l54_ret_ref_pago_prov', 'custrecord_l54_ret_jurisdiccion', j);
										nlapiLogExecution('DEBUG', 'Anulacion Retenciones','Entre al for ' + j + ', tipoRetencion:'+ tipoRetencion + ', jurisdiccion:'+ jurisdiccion);
										if (tipoRetencion == tipoRetGan) {
											var resultInfNumerador =  numeradoresObtenidos.filter(function(obj) {
												return (obj.tipoTransId == tipoTransacGanAnul);
											});
											nlapiLogExecution('DEBUG', 'Anulacion Retenciones','Entre a la validacion de Ganancias resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											//log.debug('Anulacion Retenciones', 'Entre a la validacion de Ganancias resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											if(resultInfNumerador.length == 0){
												var existenErroresNumAnulacion = true;
											}
										}

										if (tipoRetencion == tipoRetIva) {
											var resultInfNumerador =  numeradoresObtenidos.filter(function(obj) {
												return (obj.tipoTransId == tipoTransacIvaAnul);
											});
											nlapiLogExecution('DEBUG', 'Anulacion Retenciones','Entre a la validacion de IVA resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											//log.debug('Anulacion Retenciones', 'Entre a la validacion de IVA resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											if(resultInfNumerador.length == 0){
												var existenErroresNumAnulacion = true;
											}
										}
										if (tipoRetencion == tipoRetIibb) {
											var resultInfNumerador =  numeradoresObtenidos.filter(function(obj) {
												return (obj.tipoTransId == tipoTransacIibbAnul && obj.jurisdiccion == jurisdiccion);
											});
											nlapiLogExecution('DEBUG', 'Anulacion Retenciones','Entre a la validacion de IIBB resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											//log.debug('Anulacion Retenciones', 'Entre a la validacion de IIBB resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											if(resultInfNumerador.length == 0){
												var existenErroresNumAnulacion = true;
											}
										}
										if (tipoRetencion == tipoRetSuss) {
											var resultInfNumerador =  numeradoresObtenidos.filter(function(obj) {
												return (obj.tipoTransId == tipoTransacSussAnul);
											});
											nlapiLogExecution('DEBUG', 'Anulacion Retenciones','Entre a la validacion de SUSS resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											//log.debug('Anulacion Retenciones', 'Entre a la validacion de SUSS resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											if(resultInfNumerador.length == 0){
												var existenErroresNumAnulacion = true;
											}
										}
										if (tipoRetencion == tipoRetMuni) {
											var resultInfNumerador =  numeradoresObtenidos.filter(function(obj) {
												return (obj.tipoTransId == tipoTransacMuniAnul);
											});
											nlapiLogExecution('DEBUG', 'Anulacion Retenciones','Entre a la validacion de Municipal resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											//log.debug('Anulacion Retenciones', 'Entre a la validacion de SUSS resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											if(resultInfNumerador.length == 0){
												var existenErroresNumAnulacion = true;
											}
										}
										if (tipoRetencion == tipoRetInym) {
											var resultInfNumerador =  numeradoresObtenidos.filter(function(obj) {
												return (obj.tipoTransId == tipoTransacInymAnul);
											});
											nlapiLogExecution('DEBUG', 'Anulacion Retenciones','Entre a la validacion de INYM resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											//log.debug('Anulacion Retenciones', 'Entre a la validacion de SUSS resultInfNumerador: '+JSON.stringify(resultInfNumerador));
											if(resultInfNumerador.length == 0){
												var existenErroresNumAnulacion = true;
											}
										}

									}

								}

								nlapiLogExecution('DEBUG', 'Anulacion Retenciones','existenErroresNumAnulacion: '+existenErroresNumAnulacion);


								if (!existenErroresNumAnulacion) {
									// Busco las Retenciones del Pago
									var filtroRetenciones = new Array();
									filtroRetenciones[0] = new nlobjSearchFilter('custrecord_l54_ret_ref_pago_prov', null, 'is', recId);
									filtroRetenciones[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
									
									var columnaRetenciones = new nlobjSearchColumn('internalid');
									var resultadoRetenciones = new nlapiSearchRecord('customrecord_l54_retencion', null, filtroRetenciones, columnaRetenciones);
									
									for (var j = 0; resultadoRetenciones != null && j < resultadoRetenciones.length; j++) {
										var recordRetencion = nlapiLoadRecord("customrecord_l54_retencion", resultadoRetenciones[j].getValue('internalid'));
										recordRetencion.setFieldValue("custrecord_l54_ret_anulado", 'T');
										try {
											var idRR = nlapiSubmitRecord(recordRetencion, true);
										} catch (e) {
											nlapiLogExecution('ERROR', 'Error Anulando Retencion', 'ID Interno Retencion : ' + resultadoRetenciones[j].getFieldValue('internalid') + ' NetSuite error: ' + e.message);
										}
									}

									// FIX 04/06/2014
									if (registroCargado == true) {

										if (parseFloat(monto_ret_ganancias) != 0 || parseFloat(monto_ret_suss) != 0 || parseFloat(monto_ret_iva) != 0 || parseFloat(monto_ret_iibb) != 0 || parseFloat(monto_ret_muni) != 0 || parseFloat(monto_ret_inym) != 0) {

											// creo un journal entry con el reverse del journal entry que cree en el alta de la transacciÃ³n
											var record_journalentry = nlapiCreateRecord('journalentry');
											
											record_journalentry.setFieldValue('memo', codigo_op);
											record_journalentry.setFieldValue('custbody_l54_op_asociado', codigo_op);
											if (!isEmpty(subsidiary)) {
												record_journalentry.setFieldValue('subsidiary', subsidiary);
											}
											//record_journalentry.setFieldValue('trandate', trandate);
											record_journalentry.setFieldValue('currency', moneda);
											record_journalentry.setFieldValue('exchangerate', parseFloat(tasa_pago));

											record_journalentry.selectNewLineItem('line');
											record_journalentry.setCurrentLineItemValue('line', 'entity', entity);

											if (!isEmpty(department))
												record_journalentry.setCurrentLineItemValue('line', 'department', department);

											if (!isEmpty(location))
												record_journalentry.setCurrentLineItemValue('line', 'location', location);

											if (!isEmpty(clase))
												record_journalentry.setCurrentLineItemValue('line', 'class', clase);

											record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
											record_journalentry.setCurrentLineItemValue('line', 'account', id_account);
											record_journalentry.setCurrentLineItemValue('line', 'credit', parseFloat(monto_ret_total));
											record_journalentry.commitLineItem('line');

											if(cuentaClearing){
												record_journalentry.selectNewLineItem('line');
												record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

												if (!isEmpty(department))
													record_journalentry.setCurrentLineItemValue('line', 'department', department);

												if (!isEmpty(location))
													record_journalentry.setCurrentLineItemValue('line', 'location', location);

												if (!isEmpty(clase))
													record_journalentry.setCurrentLineItemValue('line', 'class', clase);

												// retenciones ganancias
												record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
												record_journalentry.setCurrentLineItemValue('line', 'account', ctaBancoAuxiliar);
												record_journalentry.setCurrentLineItemValue('line', 'debit', parseFloat(monto_retencicon));
												record_journalentry.commitLineItem('line');
											}

											// si tiene retenciones de ganancias
											if (parseFloat(monto_ret_ganancias) != 0 && parseFloat(monto_ret_ganancias) != '') {

												record_journalentry.selectNewLineItem('line');
												record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

												if (!isEmpty(department))
													record_journalentry.setCurrentLineItemValue('line', 'department', department);

												if (!isEmpty(location))
													record_journalentry.setCurrentLineItemValue('line', 'location', location);

												if (!isEmpty(clase))
													record_journalentry.setCurrentLineItemValue('line', 'class', clase);

												// retenciones ganancias
												record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
												record_journalentry.setCurrentLineItemValue('line', 'account', id_ret_ganancias);
												record_journalentry.setCurrentLineItemValue('line', 'debit', parseFloat(monto_ret_ganancias));
												record_journalentry.commitLineItem('line');
											}

											// si tiene retenciones de SUSS
											if (parseFloat(monto_ret_suss) != 0 && parseFloat(monto_ret_suss) != '') {

												record_journalentry.selectNewLineItem('line');
												record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

												if (!isEmpty(department))
													record_journalentry.setCurrentLineItemValue('line', 'department', department);

												if (!isEmpty(location))
													record_journalentry.setCurrentLineItemValue('line', 'location', location);

												if (!isEmpty(clase))
													record_journalentry.setCurrentLineItemValue('line', 'class', clase);

												// retenciones SUSS
												record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
												record_journalentry.setCurrentLineItemValue('line', 'account', id_ret_suss);
												record_journalentry.setCurrentLineItemValue('line', 'debit', parseFloat(monto_ret_suss));
												record_journalentry.commitLineItem('line');
											}

											// si tiene retenciones de IVA
											if (parseFloat(monto_ret_iva) != 0 && parseFloat(monto_ret_iva) != '') {

												record_journalentry.selectNewLineItem('line');
												record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

												if (!isEmpty(department))
													record_journalentry.setCurrentLineItemValue('line', 'department', department);

												if (!isEmpty(location))
													record_journalentry.setCurrentLineItemValue('line', 'location', location);

												if (!isEmpty(clase))
													record_journalentry.setCurrentLineItemValue('line', 'class', clase);

												// retenciones IVA
												record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
												record_journalentry.setCurrentLineItemValue('line', 'account', id_ret_iva);
												record_journalentry.setCurrentLineItemValue('line', 'debit', parseFloat(monto_ret_iva));
												record_journalentry.commitLineItem('line');
											}

											// si tiene retenciones de IIBB
											if (parseFloat(monto_ret_iibb) != 0 && parseFloat(monto_ret_iibb) != '') {

												// 2015 - IIBB por Jurisdicciones
												arrayIDIIBB = idsRetIIBB.split(',');

												for (var j = 0; arrayIDIIBB != null && j < arrayIDIIBB.length; j++) {
													var recordRetencion = nlapiLoadRecord("customrecord_l54_retencion", arrayIDIIBB[j]);
													var jurisdiccionIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_jurisdiccion");
													var cuentaIIBB = obtenerCuentaIIBB(subsidiary, jurisdiccionIIBB);
													//var cuentaIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_cuenta");
													var importeIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_importe");

													record_journalentry.selectNewLineItem('line');
													record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

													if (!isEmpty(department))
														record_journalentry.setCurrentLineItemValue('line', 'department', department);

													if (!isEmpty(location))
														record_journalentry.setCurrentLineItemValue('line', 'location', location);

													if (!isEmpty(clase))
														record_journalentry.setCurrentLineItemValue('line', 'class', clase);

													// retenciones IIBB
													record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
													record_journalentry.setCurrentLineItemValue('line', 'account', cuentaIIBB);
													record_journalentry.setCurrentLineItemValue('line', 'debit', parseFloat(importeIIBB));
													record_journalentry.commitLineItem('line');
												}
											}

											// si tiene retenciones Municipal
											if (parseFloat(monto_ret_muni) != 0 && parseFloat(monto_ret_muni) != '') {

												// 2015 - IIBB por Jurisdicciones
												arrayIDIIBB = idsRetMuni.split(',');

												for (var j = 0; arrayIDIIBB != null && j < arrayIDIIBB.length; j++) {
													var recordRetencion = nlapiLoadRecord("customrecord_l54_retencion", arrayIDIIBB[j]);
													var jurisdiccionIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_jurisdiccion");
													var cuentaIIBB = obtenerCuentaIIBB(subsidiary, jurisdiccionIIBB);
													//var cuentaIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_cuenta");
													var importeIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_importe");

													record_journalentry.selectNewLineItem('line');
													record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

													if (!isEmpty(department))
														record_journalentry.setCurrentLineItemValue('line', 'department', department);

													if (!isEmpty(location))
														record_journalentry.setCurrentLineItemValue('line', 'location', location);

													if (!isEmpty(clase))
														record_journalentry.setCurrentLineItemValue('line', 'class', clase);

													// retenciones IIBB
													record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
													record_journalentry.setCurrentLineItemValue('line', 'account', cuentaIIBB);
													record_journalentry.setCurrentLineItemValue('line', 'debit', parseFloat(importeIIBB));
													record_journalentry.commitLineItem('line');
												}
											}

											// si tiene retenciones INYM
											if (parseFloat(monto_ret_inym) != 0 && parseFloat(monto_ret_inym) != '') {

												// 2015 - IIBB por Jurisdicciones
												arrayIDIIBB = idsRetInym.split(',');

												for (var j = 0; arrayIDIIBB != null && j < arrayIDIIBB.length; j++) {
													var recordRetencion = nlapiLoadRecord("customrecord_l54_retencion", arrayIDIIBB[j]);
													var jurisdiccionIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_jurisdiccion");
													var cuentaIIBB = obtenerCuentaIIBB(subsidiary, jurisdiccionIIBB);
													//var cuentaIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_cuenta");
													var importeIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_importe");

													record_journalentry.selectNewLineItem('line');
													record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

													if (!isEmpty(department))
														record_journalentry.setCurrentLineItemValue('line', 'department', department);

													if (!isEmpty(location))
														record_journalentry.setCurrentLineItemValue('line', 'location', location);

													if (!isEmpty(clase))
														record_journalentry.setCurrentLineItemValue('line', 'class', clase);

													// retenciones IIBB
													record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
													record_journalentry.setCurrentLineItemValue('line', 'account', cuentaIIBB);
													record_journalentry.setCurrentLineItemValue('line', 'debit', parseFloat(importeIIBB));
													record_journalentry.commitLineItem('line');
												}
											}

											try {
												var idTmp = nlapiSubmitRecord(record_journalentry, false, true);
											} catch (e) {
												nlapiLogExecution('ERROR', 'Error generando el journalentry (Edit)', 'NetSuite error: ' + e.message);
											}
										}
									}
									/* INICIO - ANULACION DE ACUMULADOS PARA PAGO */

									// Busco los acumulados del Pago
									var filtroAcumulados = new Array();
									filtroAcumulados[0] = new nlobjSearchFilter('custrecord_l54_acum_ret_pago_asoc', null, 'anyof', recId);
									filtroAcumulados[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
									
									var columnaAcumulados = new nlobjSearchColumn('internalid');
									var resultadosAcumulados = new nlapiSearchRecord('customrecord_l54_acumulados_retenciones', null, filtroAcumulados, columnaAcumulados);
									
									for (var j = 0; resultadosAcumulados != null && j < resultadosAcumulados.length; j++) {
										var recordAcumulado = nlapiLoadRecord("customrecord_l54_acumulados_retenciones", resultadosAcumulados[j].getValue('internalid'));
										recordAcumulado.setFieldValue("custrecord_l54_acum_ret_anulado", 'T');
										try {
											var idRR = nlapiSubmitRecord(recordAcumulado, true);
										} catch (e) {
											nlapiLogExecution('ERROR', 'Error Anulando Acumulado', 'ID Interno Retencion : ' + resultadosAcumulados[j].getFieldValue('internalid') + ' NetSuite error: ' + e.message);
										}
									}

									/* FIN - ANULACION DE ACUMULADOS PARA PAGO */

									
									try {
										voidingId = nlapiVoidTransaction(recType, recId);
										nlapiLogExecution('DEBUG', 'Anular Pago', 'Pago anulado exitosamente.');
									} catch(e) {
										nlapiLogExecution('ERROR', 'Error Anulando Pago', 'No se pudo anular el pago - Netsuite Exception: ' + JSON.stringify(e.message));
									}

									try{
										
										nlapiSubmitField(recType, recId,'custbody_l54_ret_anuladas', 'T');
										if(idTmp != null && idTmp != ''){
											nlapiSubmitField(recType, recId,'custbody_l54_id_void_journal', idTmp);
										}

										alert('El proceso de anulación de retenciones culminó exitosamente')
									} catch (e) {
										nlapiLogExecution('ERROR', 'Error Anulando Retencion', 'Error: Seteando campo de Retenciones Anuladas - NetSuite error: ' + e.message);	
									}
								} else {
									alert('Revisar los Numeradores existentes ya que no se hay coincidencia con todos las retenciones a anular');
									nlapiLogExecution('DEBUG', 'Anulacion Retenciones','Error existenErroresNumAnulacion: '+existenErroresNumAnulacion);
								}
								

								// Fin Crear Reverse del ASiento
							}

							

							
						}
					}
			} catch (e) {
				nlapiLogExecution('ERROR', 'Error Anulando Retenciones', 'NetSuite error: ' + e.message);
			}
		}
	}
	nlapiLogExecution('DEBUG', 'anularRetenciones()', 'CLOSE');	
}

function obtenerNumeradores(tipoTransId, subsidiary, boca, letra){
	nlapiLogExecution('DEBUG', 'anularRetenciones()','INICIO - devolverNuevoNumero');
	nlapiLogExecution('DEBUG', 'anularRetenciones()','Parámetros - tipoTransId: '+tipoTransId + ', boca: '+boca + ', letra: '+letra  + ', subsidiaria: '+subsidiary);

	if (!isEmpty(tipoTransId) && !isEmpty(boca) && !isEmpty(letra)) {
		           
		var filters = new Array();
		var resultadoArray = new Array();
		filters[0] = new nlobjSearchFilter('custrecord_l54_num_tipo_trans', null, 'anyof', tipoTransId); // ver que si es debit memo, que hago
		filters[1] = new nlobjSearchFilter('custrecord_l54_num_boca', null, 'anyof', boca);
		filters[2] = new nlobjSearchFilter('custrecord_l54_num_letra', null, 'anyof', letra);
		if (!isEmpty(subsidiary)) {
			filters[3] = new nlobjSearchFilter('custrecord_l54_num_subsidiaria', null, 'is', subsidiary);
		}

		var search = new nlapiLoadSearch('customrecord_l54_numeradores', 'customsearch_l54_numeradores_anul_ret');
		search.addFilters(filters);
		var searchResults = search.runSearch();
		var columns = searchResults.getColumns();
		var resultadoNumeradores;

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
					resultadoNumeradores = resultado; //Primera ve inicializa
				else
					resultadoNumeradores = resultadoNumeradores.concat(resultado);
			}

			// increase pointer
			resultIndex = resultIndex + resultStep;

			// once no records are returned we already got all of them
		} while (!isEmpty(resultado) && resultado.length > 0)
		nlapiLogExecution('DEBUG', 'anularRetenciones()', JSON.stringify(resultadoNumeradores));
		if(!isEmpty(resultadoNumeradores) && resultadoNumeradores.length > 0){
			for(var i = 0; i < resultadoNumeradores.length; i++){
				var info = {};
				info.internalId = resultadoNumeradores[i].getValue(columns[0]);
				info.tipoTransId = resultadoNumeradores[i].getValue(columns[1]);
				info.tipoTransIdText = resultadoNumeradores[i].getText(columns[1]);
				info.jurisdiccion = resultadoNumeradores[i].getValue(columns[2]);
				info.jurisdiccionText = resultadoNumeradores[i].getText(columns[2]);
				resultadoArray.push(info);
			}
		}
		nlapiLogExecution('DEBUG', 'anularRetenciones()', JSON.stringify(resultadoArray));
		return resultadoArray;
	}
}

function obtenerCuentaIIBB(subsidiaria, jurisdiccionIIBB) {
	//nlapiLogExecution('DEBUG', 'obtenerCuentaIIBB', 'subsidiaria:' + subsidiaria + ',jurisdiccionIIBB:' + jurisdiccionIIBB);

	var idCuenta = 0;
	if (!isEmpty(jurisdiccionIIBB)) {
		var filtroConfGeneral = new Array();
		filtroConfGeneral[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		if (!isEmpty(subsidiaria))
			filtroConfGeneral[1] = new nlobjSearchFilter('custrecord_l54_pv_gral_subsidiaria', null, 'is', subsidiaria);
		var columnaConfGeneral = new Array();
		columnaConfGeneral[0] = new nlobjSearchColumn('internalid');

		var resultadosConfGeneral = new nlapiSearchRecord("customrecord_l54_pv_iibb_config_general", null, filtroConfGeneral, columnaConfGeneral);

		//nlapiLogExecution('DEBUG', 'obtenerCuentaIIBB', 'resultadosConfGeneral:' + resultadosConfGeneral + ',resultadosConfGeneral.length:' + resultadosConfGeneral.length);

		if (resultadosConfGeneral != null && resultadosConfGeneral.length > 0) {

			var idConfGeneral = resultadosConfGeneral[0].getValue('internalid');
			if (!isEmpty(idConfGeneral) && idConfGeneral > 0) {
				nlapiLogExecution('DEBUG', 'obtenerCuentaIIBB', 'idConfGeneral:' + idConfGeneral);

				//
				var filtroConfDetalle = new Array();
				filtroConfDetalle[0] = new nlobjSearchFilter('custrecord_l54_pv_det_link_padre', null, 'is', idConfGeneral);
				filtroConfDetalle[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
				filtroConfDetalle[2] = new nlobjSearchFilter('custrecord_l54_pv_det_jurisdiccion', null, 'is', jurisdiccionIIBB);

				var columnasConfDetalle = new Array();
				columnasConfDetalle[0] = new nlobjSearchColumn('internalid');
				columnasConfDetalle[1] = new nlobjSearchColumn('custrecord_l54_pv_det_cuenta_ret');

				var resultadosConfDetalle = new nlapiSearchRecord("customrecord_l54_pv_iibb_config_detalle", null, filtroConfDetalle, columnasConfDetalle);

				nlapiLogExecution('DEBUG', 'obtenerCuentaIIBB', 'resultadosConfDetalle:' + resultadosConfDetalle + ',resultadosConfDetalle.length:' + resultadosConfDetalle.length);

				if (resultadosConfDetalle != null && resultadosConfDetalle.length > 0) {
					var cuentaRetencion = resultadosConfDetalle[0].getValue('custrecord_l54_pv_det_cuenta_ret');
					if (!isEmpty(cuentaRetencion) && cuentaRetencion > 0) {
						idCuenta = cuentaRetencion;
					}
				}
			}
		}
	}
	return idCuenta;
}