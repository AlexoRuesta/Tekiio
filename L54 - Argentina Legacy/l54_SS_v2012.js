/*
Localizaciones Argentina V2015 - SCRIPTS SERVER SIDE
3KSYS SRL Argentina

Modificaciones:
==============
// 22/05/2014 --- Se pasaron los Importes de Retencions,Netos a Abonar y Bill a Moneda de Transaccion y Impresion de PDF en $ (PESOS)
// 25/12/2014 --- FDS2: ModificaciÃ³n del calculo del monto escrito. Busca la configuraciÃ³n de si tiene en cuenta decimales o no, y calcular el mismo en base a esa configuraciÃ³n. La configuraciÃ³n es por subsidiaria y se encuentra en la tabla Datos Impositivos Empresa.
// 15/05/15 - PC: Impresion de pdf para enviar por mail
// 06/12/2015 - FDS1: Cambio para que el calcular percepciones ignore las lineas que tienen percepcion 0
// 14/09/2017 --- abrito: Se agregó el proceso para anular las retenciones cuando el tilde de contabilidad "Transacciones De Anulación Utilizando Diario De Inversión" esta deshabilitado.
// 17/04/2019 - JSalazar: Se agregó la validación de no calcular PV a notas de créditos parciales.
// 15/08/2019 - JSalazar: Se agregó l54beforeSubmitCustomerpayment para setear numerador preferido a las customerpayments, si es que existe uno preferido.
// 28/08/2019 - JSalazar: Se agrega cambio de eAciba para manejo especial de importes de percepción y retención
 */

// Libreria auxiliar

function isEmpty(value) {

	return value === '' || value === null || value === undefined || value === 'null' || value === 'undefined';
}

function isEmptyOK(value) {

	return (value === 'undefined' || value === undefined || value === null || value === 'null' || value === '');
}

Number.prototype.toFixedOK = function(decimals) {
    var sign = this >= 0 ? 1 : -1;
    return (Math.round((this*Math.pow(10,decimals))+(sign*0.001))/Math.pow(10,decimals)).toFixed(decimals);
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

function zeroFill(number, width) {

	width -= number.toString().length;
	if (width > 0) {

		return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
	}

	return number;
}

function redondeo2decimales(numero) {

	/*var original = parseFloat(numero);
	var result = Math.round(original*100)/100 ;
	return result;*/
	var result = parseFloat(Math.round(parseFloat(numero) * 100) / 100).toFixed(2);
	return result;
}

// -------------------------------------------------------------------------
// Funciones Secundarias

function getTipoTransId(tipoTransStr) {
	/*SU 20150713 - Modificacion para validar que los Criterios no sean NULL*/
	if (!isEmpty(tipoTransStr)) {

		var filters = [new nlobjSearchFilter('name', null, 'is', tipoTransStr, null)];
		var columns = [new nlobjSearchColumn('internalId')];

		var results = new nlapiSearchRecord("customlist_l54_tipo_transaccion", null, filters, columns);

		if (results != null && results.length == 1)
			return results[0].getValue('internalId');
		else
			return null;

	}
	return null;
}

function obtenerIDMoneda(monedaId) {
	var idMonedaAFIP = "";
	if (!isEmpty(monedaId)) {
		var filters = new Array();
		filters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filters[1] = new nlobjSearchFilter('custrecord_l54_moneda', null, 'is', monedaId);

		var columns = new nlobjSearchColumn("internalid");

		var results = nlapiSearchRecord('customrecord_l54_monedas_fex', null, filters, columns);

		if (results != null && results.length > 0) {
			idMonedaAFIP = results[0].getValue('internalid');
		}
	}
	return idMonedaAFIP;
}

function obtenerCodigoMoneda(monedaId) {
	var idMonedaAFIP = "";
	if (!isEmpty(monedaId)) {
		var filters = new Array();
		filters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filters[1] = new nlobjSearchFilter('custrecord_l54_moneda', null, 'is', monedaId);

		var columns = new nlobjSearchColumn("custrecord_l54_cod_moneda_fex");

		var results = nlapiSearchRecord('customrecord_l54_monedas_fex', null, filters, columns);

		if (results != null && results.length > 0) {
			idMonedaAFIP = results[0].getValue('custrecord_l54_cod_moneda_fex');
		}
	}
	return idMonedaAFIP;
}

function devolverNuevoNumero(tipoTransId, boca, letra, subsidiaria, jurisdiccion, esLiquidoProducto, esCreditoElectronico) {

	/*SU 20150713 - Modificacion para validar que los Criterios no sean NULL*/

	if (!isEmpty(tipoTransId) && !isEmpty(boca) && !isEmpty(letra)) {

		var filters = new Array();

		filters[0] = new nlobjSearchFilter('custrecord_l54_num_tipo_trans', null, 'anyof', tipoTransId); // ver que si es debit memo, que hago
		filters[1] = new nlobjSearchFilter('custrecord_l54_num_boca', null, 'anyof', boca);
		filters[2] = new nlobjSearchFilter('custrecord_l54_num_letra', null, 'anyof', letra);
		filters[3] = new nlobjSearchFilter('custrecord_l54_num_fecha_inicio', null, 'onorbefore', 'today');
		filters[4] = new nlobjSearchFilter('custrecord_l54_num_fecha_vencimiento', null, 'onorafter', 'today');
		filters[5] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filters[6] = new nlobjSearchFilter('custrecord_l54_num_liquido_producto', null, 'is', esLiquidoProducto);
		filters[7] = new nlobjSearchFilter('custrecord_l54_num_credito_electronico', null, 'is', esCreditoElectronico);

		if (!isEmpty(jurisdiccion))
			filters[8] = new nlobjSearchFilter('custrecord_l54_num_jurisdiccion', null, 'is', jurisdiccion);

		if (!isEmpty(subsidiaria)) {
			if (!isEmpty(jurisdiccion))
				filters[9] = new nlobjSearchFilter('custrecord_l54_num_subsidiaria', null, 'is', subsidiaria);
			else
				filters[8] = new nlobjSearchFilter('custrecord_l54_num_subsidiaria', null, 'is', subsidiaria);
		}

		var columns = [new nlobjSearchColumn("custrecord_l54_num_numerador"),
			new nlobjSearchColumn("custrecord_l54_num_numerador_inicial"),
			new nlobjSearchColumn("custrecord_l54_num_numerador_long"),
			new nlobjSearchColumn("custrecord_l54_num_prefijo"),
			new nlobjSearchColumn("custrecord_l54_num_electronico"),
			new nlobjSearchColumn("custrecord_l54_num_tipo"),
			new nlobjSearchColumn("custrecord_l54_num_tipo_trans_afip"),
			new nlobjSearchColumn("internalid")
		];

		var results = nlapiSearchRecord('customrecord_l54_numeradores', null, filters, columns);

		var numeradorElectronico = false;
		var tipoMiddleware = 1;
		var tipoTransaccionAFIP = "";
		var idInternoNumerador = "";

		if (results != null && results.length > 0) {

			nlapiLogExecution('DEBUG', 'devolverNuevoNumero', 'LINE 167 - Result nuevo numero: ' + JSON.stringify(results));
			var numerador = results[0].getValue('custrecord_l54_num_numerador');
			var numeradorInicial = results[0].getValue('custrecord_l54_num_numerador_inicial');
			var numeradorLong = results[0].getValue('custrecord_l54_num_numerador_long');
			var numeradorPrefijo = results[0].getValue('custrecord_l54_num_prefijo');
			numeradorElectronico = results[0].getValue('custrecord_l54_num_electronico');
			tipoMiddleware = results[0].getValue('custrecord_l54_num_tipo');
			tipoTransaccionAFIP = results[0].getValue('custrecord_l54_num_tipo_trans_afip');
			idInternoNumerador = results[0].getValue('internalid');
			var recId = results[0].getId();
		}

		if (!isEmpty(numeradorElectronico) && numeradorElectronico == 'T') {
			// Si es Numerador Electronico
			var numeradorArray = new Array();
			numeradorArray['referencia'] = idInternoNumerador;
			numeradorArray['numerador'] = ""; // numerador
			numeradorArray['numeradorPrefijo'] = ""; // prefijo + numerador
			numeradorArray['numeradorElectronico'] = 'T';
			numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
			return numeradorArray;
		} else {

			if (isEmpty(numerador)) {

				nlapiSubmitField('customrecord_l54_numeradores', recId, ['custrecord_l54_num_numerador'], [parseInt(numeradorInicial) + 1]);
				numerador = numeradorInicial;
			} else
				nlapiSubmitField('customrecord_l54_numeradores', recId, ['custrecord_l54_num_numerador'], [parseInt(numerador) + 1]);

			var numerador = zeroFill(numerador, numeradorLong);

			if (!isEmpty(numeradorPrefijo)) {

				var numeradorArray = new Array();
				numeradorArray['referencia'] = idInternoNumerador;
				numeradorArray['numerador'] = numerador.toString(); // numerador
				numeradorArray['numeradorPrefijo'] = numeradorPrefijo.toString() + numerador.toString(); // prefijo + numerador
				numeradorArray['numeradorElectronico'] = 'F';
				numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
				return numeradorArray;
			} else {

				var numeradorArray = new Array();
				numeradorArray['referencia'] = idInternoNumerador;
				numeradorArray['numerador'] = numerador.toString(); // numerador
				numeradorArray['numeradorPrefijo'] = numerador.toString(); // prefijo + numerador
				numeradorArray['numeradorElectronico'] = 'F';
				numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
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
		return numeradorArray;
	}
}

function consultarNumerador(tipoTransId, boca, letra, subsidiaria, jurisdiccion, esLiquidoProducto, esCreditoElectronico) {

	/*SU 20150713 - Modificacion para validar que los Criterios no sean NULL*/

	if (!isEmpty(tipoTransId) && !isEmpty(boca) && !isEmpty(letra)) {

		var filters = new Array();

		filters[0] = new nlobjSearchFilter('custrecord_l54_num_tipo_trans', null, 'anyof', tipoTransId); // ver que si es debit memo, que hago
		filters[1] = new nlobjSearchFilter('custrecord_l54_num_boca', null, 'anyof', boca);
		filters[2] = new nlobjSearchFilter('custrecord_l54_num_letra', null, 'anyof', letra);
		filters[3] = new nlobjSearchFilter('custrecord_l54_num_fecha_inicio', null, 'onorbefore', 'today');
		filters[4] = new nlobjSearchFilter('custrecord_l54_num_fecha_vencimiento', null, 'onorafter', 'today');
		filters[5] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filters[6] = new nlobjSearchFilter('custrecord_l54_num_liquido_producto', null, 'is', esLiquidoProducto);
		filters[7] = new nlobjSearchFilter('custrecord_l54_num_credito_electronico', null, 'is', esCreditoElectronico);
		

		if (!isEmpty(jurisdiccion))
			filters[8] = new nlobjSearchFilter('custrecord_l54_num_jurisdiccion', null, 'is', jurisdiccion);

		if (!isEmpty(subsidiaria)) {
			if (!isEmpty(jurisdiccion))
				filters[9] = new nlobjSearchFilter('custrecord_l54_num_subsidiaria', null, 'is', subsidiaria);
			else
				filters[8] = new nlobjSearchFilter('custrecord_l54_num_subsidiaria', null, 'is', subsidiaria);

		}

		var columns = [new nlobjSearchColumn("custrecord_l54_num_numerador"),
			new nlobjSearchColumn("custrecord_l54_num_numerador_inicial"),
			new nlobjSearchColumn("custrecord_l54_num_numerador_long"),
			new nlobjSearchColumn("custrecord_l54_num_prefijo"),
			new nlobjSearchColumn("custrecord_l54_num_electronico"),
			new nlobjSearchColumn("custrecord_l54_num_tipo"),
			new nlobjSearchColumn("custrecord_l54_num_tipo_trans_afip"),
			new nlobjSearchColumn("internalid")
		];

		var results = nlapiSearchRecord('customrecord_l54_numeradores', null, filters, columns);

		var numeradorElectronico = false;
		var tipoMiddleware = 1;
		var tipoTransaccionAFIP = "";
		var idInternoNumerador = "";

		if (results != null && results.length > 0) {

			var numerador = results[0].getValue('custrecord_l54_num_numerador');
			var numeradorInicial = results[0].getValue('custrecord_l54_num_numerador_inicial');
			var numeradorLong = results[0].getValue('custrecord_l54_num_numerador_long');
			var numeradorPrefijo = results[0].getValue('custrecord_l54_num_prefijo');
			numeradorElectronico = results[0].getValue('custrecord_l54_num_electronico');
			tipoMiddleware = results[0].getValue('custrecord_l54_num_tipo');
			tipoTransaccionAFIP = results[0].getValue('custrecord_l54_num_tipo_trans_afip');
			idInternoNumerador = results[0].getValue('internalid');
			var recId = results[0].getId();
		}

		if (!isEmpty(numeradorElectronico) && numeradorElectronico == 'T') {
			// Si es Numerador Electronico
			var numeradorArray = new Array();
			numeradorArray['referencia'] = idInternoNumerador;
			numeradorArray['numerador'] = ""; // numerador
			numeradorArray['numeradorPrefijo'] = ""; // prefijo + numerador
			numeradorArray['numeradorElectronico'] = 'T';
			numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
			return numeradorArray;
		} else {
			if (!isEmpty(numeradorPrefijo)) {

				var numeradorArray = new Array();
				numeradorArray['referencia'] = idInternoNumerador;
				numeradorArray['numerador'] = numerador.toString(); // numerador
				numeradorArray['numeradorPrefijo'] = numeradorPrefijo.toString() + numerador.toString(); // prefijo + numerador
				numeradorArray['numeradorElectronico'] = 'F';
				numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
				return numeradorArray;
			} else {

				var numeradorArray = new Array();
				numeradorArray['referencia'] = idInternoNumerador;
				numeradorArray['numerador'] = numerador.toString(); // numerador
				numeradorArray['numeradorPrefijo'] = numerador.toString(); // prefijo + numerador
				numeradorArray['numeradorElectronico'] = 'F';
				numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
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
		return numeradorArray;
	}
}

function letras(c, d, u) {

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

		return lc + ld;
	}
	if (decenas == 0 || decom == 0) {

		//return lc+" "+ld+lu;
		return lc + ld + lu;
	} else {

		if (decenas == 2) {

			ld = "VEINTI";
			return lc + ld + lu.toLowerCase();
		} else {

			return lc + ld + " Y " + lu
		}
	}
}

function getNumberLiteral(n) {

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
	999123456789
	if (n < 1000000000000 && n >= 1000000000) {

		tmp = n.toString();
		s = tmp.length;
		tmp1 = tmp.slice(0, s - 9)
			tmp2 = tmp.slice(s - 9, s);

		tmpn1 = getNumberLiteral(tmp1);
		tmpn2 = getNumberLiteral(tmp2);

		if (tmpn1.indexOf("Un") >= 0)
			pred = " BILLÓN ";
		else
			pred = " BILLONES ";

		return tmpn1 + pred + tmpn2;
	}

	if (n < 10000000000 && n >= 1000000) {

		mldata = letras(cm, dm, um);
		hlp = mldata.replace("UN", "*");
		if (hlp.indexOf("*") < 0 || hlp.indexOf("*") > 3) {

			mldata = mldata.replace("UNO", "UN");
			mldata += " MILLONES ";
		} else
			mldata = "UN MILLÓN ";

		mdata = letras(cmi, dmi, umi);
		cdata = letras(ce, de, un);

		if (mdata != "	") {
			if (n == 1000000)
				mdata = mdata.replace("UNO", "UN") + "DE";
			else
				mdata = mdata.replace("UNO", "UN") + " MIL ";
		}

		return (mldata + mdata + cdata);
	}
	if (n < 1000000 && n >= 1000) {

		mdata = letras(cmi, dmi, umi);
		cdata = letras(ce, de, un);
		hlp = mdata.replace("UN", "*");
		if (hlp.indexOf("*") < 0 || hlp.indexOf("*") > 3) {

			mdata = mdata.replace("UNO", "UN");
			return (mdata + " MIL " + cdata);
		} else
			return ("UN MIL " + cdata);
	}
	if (n < 1000 && n >= 1)
		return (letras(ce, de, un));

	if (n == 0)
		return " CERO";

	return "NO DISPONIBLE"
}

function getNumeroEnLetras(numero) {

	if (!isEmpty(numero)) {

		//var currency_name	= 'PESOS';
		var partes = numero.split('.');
		var parteEntera = partes[0];
		var parteDecimal = partes[1];
		var parteEnteraLetras = '';

		// convierto la parte entera en letras
		parteEnteraLetras = getNumberLiteral(parteEntera);
		// le hago un TRIM a la parte entera en letras
		parteEnteraLetras = parteEnteraLetras.replace(/^\s*|\s*$/g, "");

		var numeroEnLetras = 'Son ' + parteEnteraLetras + ' con ' + parteDecimal;

		// dejo el primer caracter mayuscula, el resto en minuscula
		// numeroEnLetras = numeroEnLetras.substr(0,1).toUpperCase() + numeroEnLetras.substr(1,numeroEnLetras.length).toLowerCase();

		// dejo toda la palabra en mayusculas
		numeroEnLetras = numeroEnLetras.toUpperCase();

		// le agrego MN (Moneda Nacional) al final
		numeroEnLetras = numeroEnLetras + '/100';

		return numeroEnLetras;
	}

	return NULL;
}

/*FDS2***agregado de funcion para calcular el monto escrito, teniendo en
cuenta la configuraciÃ³n de subsidiaria**/
function getNumeroEnLetras(numero, subsidiaria) {

	/*obtener configuraciÃ³n de decimales*/
	var filters = new Array();
	var i = 0;
	filters[i++] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	if (!isEmpty(subsidiaria)) {
		filters[i++] = new nlobjSearchFilter('custrecord_l54_subsidiaria', null, 'is', subsidiaria);
	}

	var columns = [new nlobjSearchColumn("custrecord_usar_decimales_monto_escrito")];

	var searchresults = new nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, filters, columns);

	var usarDecimales = null;
	if (searchresults != null && searchresults.length > 0) {
		usarDecimales = searchresults[0].getValue('custrecord_usar_decimales_monto_escrito');
	}

	if (!isEmpty(numero)) {

		if (usarDecimales == 'F') {

			//Se redondea el numero para no usar los decimales.
			var parteEntera = Math.round(numero);

			var parteEnteraLetras = '';

			// convierto la parte entera en letras
			parteEnteraLetras = getNumberLiteral(parteEntera);
			// le hago un TRIM a la parte entera en letras
			parteEnteraLetras = parteEnteraLetras.replace(/^\s*|\s*$/g, "");

			var numeroEnLetras = 'Son ' + parteEnteraLetras;

			// dejo toda la palabra en mayusculas
			numeroEnLetras = numeroEnLetras.toUpperCase();

			return numeroEnLetras;
		} else { //hay que usar decimales

			var partes = numero.split('.');
			var parteEntera = partes[0];
			var parteDecimal = partes[1];
			var parteEnteraLetras = '';

			// convierto la parte entera en letras
			parteEnteraLetras = getNumberLiteral(parteEntera);
			// le hago un TRIM a la parte entera en letras
			parteEnteraLetras = parteEnteraLetras.replace(/^\s*|\s*$/g, "");

			var numeroEnLetras = 'Son ' + parteEnteraLetras + ' con ' + parteDecimal;

			// dejo toda la palabra en mayusculas
			numeroEnLetras = numeroEnLetras.toUpperCase();

			// le agrego MN (Moneda Nacional) al final
			numeroEnLetras = numeroEnLetras + '/100';

			return numeroEnLetras;
		}
	}

	return NULL;
}

function validarNumerador(tipoTrans, boca, letra, esLiquidoProducto, esCreditoElectronico) {

	if (isEmpty(boca) || isEmpty(letra) || isEmpty(tipoTrans))
		return true;

	var cai;
	var caiVto;

	var today = new Date();

	var columns = [new nlobjSearchColumn("custrecord_l54_num_cai"),
		new nlobjSearchColumn("custrecord_l54_num_fecha_vencimiento")];

	var filters = [new nlobjSearchFilter('custrecord_l54_num_tipo_trans', null, 'anyof', tipoTrans),
		new nlobjSearchFilter('custrecord_l54_num_boca', null, 'anyof', boca),
		new nlobjSearchFilter('custrecord_l54_num_letra', null, 'anyof', letra),
		new nlobjSearchFilter('custrecord_l54_num_fecha_inicio', null, 'onorbefore', 'today'),
		new nlobjSearchFilter('custrecord_l54_num_fecha_vencimiento', null, 'onorafter', 'today'),
		new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		new nlobjSearchFilter('custrecord_l54_num_liquido_producto', null, 'is', esLiquidoProducto),
		new nlobjSearchFilter('custrecord_l54_num_credito_electronico', null, 'is', esCreditoElectronico)];

	var results = new nlapiSearchRecord('customrecord_l54_numeradores', null, filters, columns);

	if (results == null || results.length == null || results.length < 1) {

		alert('No se encuentra configurado correctamente el Numerador. Verifique el panel de AdministraciÃ³n. Muchas gracias.');
		return false;
	}

	if (results != null && results.length > 0) {

		if (!isEmpty(results[0].getValue('custrecord_l54_num_cai')))
			nlapiSetFieldValue("custbody_l54_cai", results[0].getValue('custrecord_l54_num_cai'));

		if (!isEmpty(results[0].getValue('custrecord_l54_num_fecha_vencimiento')))
			nlapiSetFieldValue("custbody_l54_cai_vto", results[0].getValue('custrecord_l54_num_fecha_vencimiento'));
	}

	return true;
}

/*
Obtiene la informacion de un Impuesto en Particular.
 */
function obtener_impuesto(arregloImpuestos,impuesto) {

	var informacionImpuesto = new Object();
	
	try {
		// nlapiLogExecution('DEBUG', 'obtener_impuesto', 'INICIO - obtener_impuesto');
		informacionImpuesto.encontrado=false;
		informacionImpuesto.custrecord_l54_excluir_proc_txt_cv="F";
		informacionImpuesto.custrecord_3k_id_impuesto_afip="";
		informacionImpuesto.custrecord_l54_columna_acumulacion="";
		informacionImpuesto.custrecord_l54_tipo_percepcion="";
		informacionImpuesto.custrecord_l54_iva_exento="F";
		informacionImpuesto.custrecord_l54_es_percepcion="F";
		
		if (!isEmpty(arregloImpuestos) && arregloImpuestos.length>0 && !isEmpty(impuesto)) {
			var resultadoImpuestos = arregloImpuestos.filter(function (obj) {
				return (obj.impuesto === impuesto);
			});

			if (!isEmpty(resultadoImpuestos) && resultadoImpuestos.length > 0) {
				informacionImpuesto.encontrado=true;

				informacionImpuesto.custrecord_l54_excluir_proc_txt_cv = resultadoImpuestos[0].excluirProcTXT;
				informacionImpuesto.custrecord_3k_id_impuesto_afip = resultadoImpuestos[0].idAFIP;
				informacionImpuesto.custrecord_l54_columna_acumulacion = resultadoImpuestos[0].colAcumulacion;
				informacionImpuesto.custrecord_l54_tipo_percepcion = resultadoImpuestos[0].tipoPercepcion;
				informacionImpuesto.custrecord_l54_iva_exento = resultadoImpuestos[0].IVAExento;
				informacionImpuesto.custrecord_l54_es_percepcion = resultadoImpuestos[0].esPercepcion;
				informacionImpuesto.custrecord_l54_otro_tributo = resultadoImpuestos[0].esOtroTributo;
				// nlapiLogExecution('DEBUG', 'obtener_impuesto', 'informacionImpuesto: ' + JSON.stringify(informacionImpuesto));
				return informacionImpuesto;
			}
		}
	} catch (e) {
		nlapiLogExecution('ERROR', 'obtener_impuesto', 'Error Netsuite - obtener_impuesto - Motivo: ' + e.message);
	}
	
	// nlapiLogExecution('DEBUG', 'obtener_impuesto', 'FIN - obtener_impuesto');
	return null;
}

function obtenerArreglo_impuesto(subsidiaria) {

	try {
		nlapiLogExecution('DEBUG', 'obtenerArreglo_impuesto', 'INICIO - obtenerArreglo_impuesto');

		var informacionArregloImpuestoResult = new Array();
		var proceso = 'obtenerArreglo_impuesto';
		var filtroImpuesto=new Array();
		filtroImpuesto[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		filtroImpuesto[1] = new nlobjSearchFilter('formulanumeric', null, 'greaterThan', 0);
		var sFormula='{internalid}';
		filtroImpuesto[1].setFormula(sFormula);
		if (!isEmpty(subsidiaria)) {
			filtroImpuesto[2] = new nlobjSearchFilter('subsidiary', null, 'is', subsidiaria);
		}

		var columnaImpuesto = [new nlobjSearchColumn('custrecord_l54_excluir_proc_txt_cv'),
			new nlobjSearchColumn('custrecord_3k_id_impuesto_afip'),
			new nlobjSearchColumn('custrecord_l54_columna_acumulacion'),
			new nlobjSearchColumn('custrecord_l54_tipo_percepcion'),
			new nlobjSearchColumn('custrecord_l54_iva_exento'),
			new nlobjSearchColumn('custrecord_l54_es_percepcion'),
			new nlobjSearchColumn('internalid'),
			new nlobjSearchColumn('custrecord_l54_otro_tributo'),];

			var informacionArregloImpuesto = new nlapiSearchRecord('salestaxitem', null, filtroImpuesto, columnaImpuesto);
			
			if (!isEmpty(informacionArregloImpuesto) && informacionArregloImpuesto.length > 0) {
				for (var i = 0; i < informacionArregloImpuesto.length; i++) {
					var info = {}
					info.impuesto = informacionArregloImpuesto[i].getValue('internalid');
					info.excluirProcTXT = informacionArregloImpuesto[i].getValue('custrecord_l54_excluir_proc_txt_cv');
					info.idAFIP = informacionArregloImpuesto[i].getValue('custrecord_3k_id_impuesto_afip');
					info.colAcumulacion = informacionArregloImpuesto[i].getValue('custrecord_l54_columna_acumulacion');
					info.tipoPercepcion = informacionArregloImpuesto[i].getValue('custrecord_l54_tipo_percepcion');				
					info.IVAExento = informacionArregloImpuesto[i].getValue('custrecord_l54_iva_exento');
					info.esPercepcion = informacionArregloImpuesto[i].getValue('custrecord_l54_es_percepcion');
					info.esOtroTributo = informacionArregloImpuesto[i].getValue('custrecord_l54_otro_tributo');
					informacionArregloImpuestoResult.push(info);
				}
			} else {
				nlapiLogExecution('ERROR', proceso, 'No se encontró ningún resultado de código de impuesto para la subsidiaria: ' + subsidiaria);
			}
	} catch (e) {
		nlapiLogExecution('ERROR', 'obtenerArreglo_impuesto', 'Error Netsuite - obtenerArreglo_impuesto - Motivo: ' + e.message);
	}

	nlapiLogExecution('DEBUG', 'obtenerArreglo_impuesto', 'informacionArregloImpuestoResult: ' + JSON.stringify(informacionArregloImpuestoResult));
	nlapiLogExecution('DEBUG', 'obtenerArreglo_impuesto', 'FIN - obtenerArreglo_impuesto');
	return informacionArregloImpuestoResult;
}

function actualizarLineasPorIva() {

	// actualizar lineas, tanto items como expenses
	// si la linea de la transacciÃ³n tiene IVA, hay que copiar el campo IMPORTE NETO a NETO GRAVADO
	// si la linea no tiene IVA, hay que copiar IMPORTE NETO a NETO NO GRAVADO

	nlapiLogExecution('DEBUG', 'actualizarLineasPorIva', 'INICIO - actualizarLineasPorIva');
	try {
		var countItems = nlapiGetLineItemCount('item');
		var countExpenses = nlapiGetLineItemCount('expense');
		var tc = nlapiGetFieldValue('exchangerate');
		
		var subsidiaria = null;
		var esOneWorld = esOneworld();
		if (esOneWorld) {
			subsidiaria = nlapiGetFieldValue('subsidiary');
		}

		var arrayAlicuotas = new Array();

		var camposImpuestos = ['custrecord_l54_excluir_proc_txt_cv', 'custrecord_3k_id_impuesto_afip', 'custrecord_l54_columna_acumulacion', 'custrecord_l54_tipo_percepcion', 'custrecord_l54_iva_exento', 'custrecord_l54_es_percepcion'];
		var arregloCodigosImpuestos = obtenerArreglo_impuesto(subsidiaria);
		
		var resultadosImpuestos = null;

		for (var repItem = 1; repItem <= countItems; repItem++) {
			
			resultadosImpuestos=null;

			var importe_neto = nlapiGetLineItemValue('item', 'amount', repItem);
			var importe_iva = nlapiGetLineItemValue('item', 'tax1amt', repItem);
			var transCodImpuesto = nlapiGetLineItemValue('item', 'taxcode', repItem);
			var tipoItem = nlapiGetLineItemValue('item', 'itemtype', repItem);
			
			var impuestoInterno = nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', repItem);

			if (tipoItem != "Subtotal" && tipoItem != "Description") {

				// Blanquear Columnas de Percepcion e IVA Extento
				nlapiSetLineItemValue('item', 'custcol_l54_es_percepcion', repItem, 'F');
				nlapiSetLineItemValue('item', 'custcol_l54_iva_exento', repItem, 'F');
				nlapiSetLineItemValue('item', 'custcol_l54_id_tipo_impuesto', repItem, '');
				
				//var esPercepcion = nlapiGetLineItemValue('item', 'custcol_l54_pv_creada', repItem);

				var porcentajeImpuestoParcial = nlapiGetLineItemValue('item', 'taxrate1', repItem);
				var porcentajeImpuesto = porcentajeImpuestoParcial;

				if (porcentajeImpuestoParcial.search('%') != -1)
					porcentajeImpuesto = porcentajeImpuestoParcial.substring(0, porcentajeImpuestoParcial.length - 1);
				porcentajeImpuesto = parseFloat(porcentajeImpuesto, 10) / 100;

				var codigoImpuestoAFIP = "";
				var excluirImpuestoAFIP = "F";
				var esPercepcion = "F";
				if (!isEmpty(transCodImpuesto)) {
					//resultadosImpuestos = nlapiLookupField('salestaxitem', transCodImpuesto, camposImpuestos);
					resultadosImpuestos = obtener_impuesto(arregloCodigosImpuestos,transCodImpuesto);
					nlapiLogExecution('DEBUG', 'actualizarLineasPorIva', 'ITEMS - resultadosImpuestos: ' + JSON.stringify(resultadosImpuestos));
					if (resultadosImpuestos!=null && resultadosImpuestos.encontrado==true) {
						excluirImpuestoAFIP = resultadosImpuestos.custrecord_l54_excluir_proc_txt_cv;
						esPercepcion = resultadosImpuestos.custrecord_l54_es_percepcion;
						if (isEmpty(excluirImpuestoAFIP))
							excluirImpuestoAFIP = 'F';
						if (excluirImpuestoAFIP != 'T')
							codigoImpuestoAFIP = resultadosImpuestos.custrecord_3k_id_impuesto_afip;
					}
					else{
						nlapiLogExecution('ERROR', 'Error guardando la transacciÃ³n y actualizando las lineas.', 'Error Obteniendo Informacion del Impuesto con ID Interno : ' + transCodImpuesto);
					}
				}
				if (!isEmpty(nlapiGetLineItemValue('item', 'custcol_l54_percepciones', repItem))) {
					esPercepcion = 'T';
				}
				if (!isEmpty(codigoImpuestoAFIP) && (importe_iva!=0 && importe_iva!=0.00)) {
					nlapiSetLineItemValue('item', 'custcol_l54_id_tipo_impuesto', repItem, codigoImpuestoAFIP);
					if (arrayAlicuotas.length > 0) {
						if (arrayAlicuotas.indexOf(codigoImpuestoAFIP) == -1) {
							arrayAlicuotas.push(codigoImpuestoAFIP);
						}
					} else {
						arrayAlicuotas.push(codigoImpuestoAFIP);
					}
				}

				if (resultadosImpuestos!=null && resultadosImpuestos.encontrado==true) {
					var columnaAcumulacion = resultadosImpuestos.custrecord_l54_columna_acumulacion;
					if (!isEmpty(columnaAcumulacion)) {
						nlapiSetLineItemValue('item', 'custcol_l54_col_acumulacion_iva_cpras', repItem, columnaAcumulacion);
					}
					var tipoPercepcion = resultadosImpuestos.custrecord_l54_tipo_percepcion;
					if (!isEmpty(tipoPercepcion)) {
						nlapiSetLineItemValue('item', 'custcol_l54_col_acumulacion_iva_cpras', repItem, tipoPercepcion);
					}
				}

				var importeNetoNoGravado = 0.00;
				var importeNetoGravado = 0.00;
				var importeExento = 0.00;

				if (importe_iva != 0 && importe_iva != 0.00 && importe_iva != null && importe_iva != '' && esPercepcion == 'F') {
					importeNetoGravado = parseFloat((parseFloat(importeNetoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);

					nlapiSetLineItemValue('item', 'custcol_l54_importe_neto_no_gravado', repItem, importeNetoNoGravado);
					nlapiSetLineItemValue('item', 'custcol_l54_importe_neto_gravado', repItem, importeNetoGravado);
					nlapiSetLineItemValue('item', 'custcol_l54_importe_exento', repItem, importeExento);
				} else {
					if (esPercepcion == 'T') {
						/*if (isEmpty(resultadosImpuestos.custrecord_l54_iva_exento) || resultadosImpuestos.custrecord_l54_iva_exento == 'F') {
							// Es una Percepcion
							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
							var importeImpuestoPercepcion = 0.00;
							if (importe_neto != 0.00 && importe_neto != 0 && importe_neto != "")
								importeImpuestoPercepcion = parseFloat((parseFloat((importe_neto * tc), 10) * porcentajeImpuesto), 10);
							else
								importeImpuestoPercepcion = parseFloat(parseFloat((importe_iva * tc), 10), 10);

							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat(importeImpuestoPercepcion, 10)), 10);
							
						}*/
						/*else{
						// Es Importe EXENTO
						importeExento=parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
						nlapiSetLineItemValue('item', 'custcol_l54_iva_exento', repItem, 'T');
						}*/
						importeNetoNoGravado = parseFloat(0.00,10);
					} else {
						if (resultadosImpuestos!=null && resultadosImpuestos.encontrado==true && resultadosImpuestos.custrecord_l54_iva_exento != 'T' && impuestoInterno!='T') {
							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
						} else {
							if(impuestoInterno!='T'){
								importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
								nlapiSetLineItemValue('item', 'custcol_l54_iva_exento', repItem, 'T');
							}
						}
					}
					nlapiSetLineItemValue('item', 'custcol_l54_importe_neto_gravado', repItem, importeNetoGravado);
					nlapiSetLineItemValue('item', 'custcol_l54_importe_neto_no_gravado', repItem, importeNetoNoGravado);
					nlapiSetLineItemValue('item', 'custcol_l54_importe_exento', repItem, importeExento);

				}
				if (esPercepcion == 'T' || !isEmpty(nlapiGetLineItemValue('item', 'custcol_l54_percepciones', repItem))) {
					nlapiSetLineItemValue('item', 'custcol_l54_es_percepcion', repItem, 'T');
				}

				nlapiLogExecution('DEBUG','actualizarLineasPorIva' , 'Se actualizo la li­nea de articulos en la Transaccion exitosamente.');
			}
		}

		for (var repExpense = 1; repExpense <= countExpenses; repExpense++) {
			
			// Blanquear Columnas de Percepcion e IVA Extento
			nlapiSetLineItemValue('expense', 'custcol_l54_es_percepcion', repExpense, 'F');
			nlapiSetLineItemValue('expense', 'custcol_l54_iva_exento', repExpense, 'F');
			nlapiSetLineItemValue('expense', 'custcol_l54_id_tipo_impuesto', repExpense, '');

			resultadosImpuestos = null;

			var importe_neto = nlapiGetLineItemValue('expense', 'amount', repExpense);
			var importe_iva = nlapiGetLineItemValue('expense', 'tax1amt', repExpense);
			var transCodImpuesto = nlapiGetLineItemValue('expense', 'taxcode', repExpense);
			
			var impuestoInterno = nlapiGetLineItemValue('expense', 'custcol_l54_impuesto_interno', repExpense);

			//var esPercepcion = nlapiGetLineItemValue('expense', 'custcol_l54_pv_creada', repExpense);
			var esPercepcion = "F";

			var porcentajeImpuestoParcial = nlapiGetLineItemValue('expense', 'taxrate1', repExpense);
			var porcentajeImpuesto = porcentajeImpuestoParcial;
			if (porcentajeImpuestoParcial.search('%') != -1)
				porcentajeImpuesto = porcentajeImpuestoParcial.substring(0, porcentajeImpuestoParcial.length - 1);
			porcentajeImpuesto = parseFloat(porcentajeImpuesto, 10) / 100;

			var codigoImpuestoAFIP = "";
			var excluirImpuestoAFIP = "F";
			if (!isEmpty(transCodImpuesto)) {
				//resultadosImpuestos = nlapiLookupField('salestaxitem', transCodImpuesto, camposImpuestos);
				resultadosImpuestos = obtener_impuesto(arregloCodigosImpuestos,transCodImpuesto);
				nlapiLogExecution('DEBUG', 'actualizarLineasPorIva', 'EXPENSAS - resultadosImpuestos: ' + JSON.stringify(resultadosImpuestos));
				if (resultadosImpuestos!=null && resultadosImpuestos.encontrado==true) {
					excluirImpuestoAFIP = resultadosImpuestos.custrecord_l54_excluir_proc_txt_cv;
					esPercepcion = resultadosImpuestos.custrecord_l54_es_percepcion;
					if (isEmpty(excluirImpuestoAFIP))
						excluirImpuestoAFIP = 'F';
					if (excluirImpuestoAFIP != 'T')
						codigoImpuestoAFIP = resultadosImpuestos.custrecord_3k_id_impuesto_afip;
				}
				else{
					nlapiLogExecution('ERROR', 'Error guardando la transacciÃ³n y actualizando las lineas.', 'Error Obteniendo Informacion del Impuesto con ID Interno : ' + transCodImpuesto);
				}
			}
			if (!isEmpty(nlapiGetLineItemValue('expense', 'custcol_l54_percepciones', repExpense))) {
				esPercepcion = 'T';
			}
			if (!isEmpty(codigoImpuestoAFIP) && (importe_iva!=0 && importe_iva!=0.00)) {
				nlapiSetLineItemValue('expense', 'custcol_l54_id_tipo_impuesto', repExpense, codigoImpuestoAFIP);
				if (arrayAlicuotas.length > 0) {
					if (arrayAlicuotas.indexOf(codigoImpuestoAFIP) == -1) {
						arrayAlicuotas.push(codigoImpuestoAFIP);
					}
				} else {
					arrayAlicuotas.push(codigoImpuestoAFIP);
				}
			}

			if (resultadosImpuestos!=null && resultadosImpuestos.encontrado==true) {
				var columnaAcumulacion = resultadosImpuestos.custrecord_l54_columna_acumulacion; ;
				if (!isEmpty(columnaAcumulacion)) {
					nlapiSetLineItemValue('expense', 'custcol_l54_col_acumulacion_iva_cpras', repExpense, columnaAcumulacion);
				}
				var tipoPercepcion = resultadosImpuestos.custrecord_l54_tipo_percepcion;
				if (!isEmpty(tipoPercepcion)) {
					nlapiSetLineItemValue('expense', 'custcol_l54_col_acumulacion_iva_cpras', repExpense, tipoPercepcion);
				}
			}

			var importeNetoNoGravado = 0.00;
			var importeNetoGravado = 0.00;
			var importeExento = 0.00;

			if (importe_iva != 0 && importe_iva != 0.00 && importe_iva != null && importe_iva != '' && esPercepcion == 'F') {
				importeNetoGravado = parseFloat((parseFloat(importeNetoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);

				nlapiSetLineItemValue('expense', 'custcol_l54_importe_neto_no_gravado', repExpense, importeNetoNoGravado);
				nlapiSetLineItemValue('expense', 'custcol_l54_importe_neto_gravado', repExpense, importeNetoGravado);
				nlapiSetLineItemValue('expense', 'custcol_l54_importe_exento', repExpense, importeExento);
			} else {
				if (esPercepcion == 'T') {
					/*if (isEmpty(resultadosImpuestos.custrecord_l54_iva_exento) || resultadosImpuestos.custrecord_l54_iva_exento == 'F') {
						// Es una Percepcion o IVA 0%
						importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
						var importeImpuestoPercepcion = 0.00;
						if (importe_neto != 0.00 && importe_neto != 0 && importe_neto != "")
							importeImpuestoPercepcion = parseFloat((parseFloat((importe_neto * tc), 10) * porcentajeImpuesto), 10);
						else
							importeImpuestoPercepcion = parseFloat(parseFloat((importe_iva * tc), 10), 10);

						importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat(importeImpuestoPercepcion, 10)), 10);
						
					}*/
					/*else{
					// Es Importe EXENTO
					importeExento=parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
					nlapiSetLineItemValue('expense', 'custcol_l54_iva_exento', repExpense, 'T');
					}*/
					importeNetoNoGravado = parseFloat(0.00,10);
				} else {
					if (resultadosImpuestos!=null && resultadosImpuestos.encontrado==true && resultadosImpuestos.custrecord_l54_iva_exento != 'T' && impuestoInterno!='T') {
							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
						} else {
							if(impuestoInterno!='T'){
								importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
								nlapiSetLineItemValue('expense', 'custcol_l54_iva_exento', repExpense, 'T');
							}
						}
				}
				nlapiSetLineItemValue('expense', 'custcol_l54_importe_neto_gravado', repExpense, importeNetoGravado);
				nlapiSetLineItemValue('expense', 'custcol_l54_importe_neto_no_gravado', repExpense, importeNetoNoGravado);
				nlapiSetLineItemValue('expense', 'custcol_l54_importe_exento', repExpense, importeExento);

			}
			if (esPercepcion == 'T' || !isEmpty(nlapiGetLineItemValue('expense', 'custcol_l54_percepciones', repExpense))) {
				nlapiSetLineItemValue('expense', 'custcol_l54_es_percepcion', repExpense, 'T');
			}

			nlapiLogExecution('DEBUG', 'actualizarLineasPorIva','Se actualizo la linea de Gastos en la Transaccion exitosamente.');

		}
		if (arrayAlicuotas.length > 0) {
			nlapiSetFieldValue('custbody_l54_cant_alicuotas', arrayAlicuotas.length);
		} else {
			nlapiSetFieldValue('custbody_l54_cant_alicuotas', 0);
		}
	} catch (e) {
		nlapiLogExecution('ERROR', 'Error guardando la transacciÃ³n y actualizando las lineas.', 'NetSuite error: ' + e.message);
	}

	nlapiLogExecution('DEBUG', 'actualizarLineasPorIva', 'FIN - actualizarLineasPorIva');
	// --- fin de actualizaciÃ³n de lineas
}

function actualizarLineasPorIvaAfterSubmit(record) {

	// actualizar lineas, tanto items como expenses
	// si la linea de la transacciÃ³n tiene IVA, hay que copiar el campo IMPORTE NETO a NETO GRAVADO
	// si la linea no tiene IVA, hay que copiar IMPORTE NETO a NETO NO GRAVADO

	try {
		var countItems = record.getLineItemCount('item');
		var countExpenses = record.getLineItemCount('expense');
		var tc = record.getFieldValue('exchangerate');
		var arrayAlicuotas = new Array();

		var camposImpuestos = ['custrecord_l54_excluir_proc_txt_cv', 'custrecord_3k_id_impuesto_afip', 'custrecord_l54_columna_acumulacion', 'custrecord_l54_tipo_percepcion', 'custrecord_l54_iva_exento', 'custrecord_l54_es_percepcion'];

		var resultadosImpuestos = null;

		for (var repItem = 1; repItem <= countItems; repItem++) {

			resultadosImpuestos = null;

			var importe_neto = record.getLineItemValue('item', 'amount', repItem);
			var importe_iva = record.getLineItemValue('item', 'tax1amt', repItem);
			var transCodImpuesto = record.getLineItemValue('item', 'taxcode', repItem);
			var taxRate = record.getLineItemValue('item', 'taxrate1', repItem);

			var tipoItem = record.getLineItemValue('item', 'itemtype', repItem);
			
			var impuestoInterno = record.getLineItemValue('item', 'custcol_l54_impuesto_interno', repItem);

			if (tipoItem != "Subtotal" && tipoItem != "Description") {

				//var esPercepcion = record.getLineItemValue('item', 'custcol_l54_pv_creada', repItem);
				var esPercepcion = "F";

				var porcentajeImpuestoParcial = record.getLineItemValue('item', 'taxrate1', repItem);
				var porcentajeImpuesto = porcentajeImpuestoParcial;
				if (porcentajeImpuestoParcial.search('%') != -1)
					porcentajeImpuesto = porcentajeImpuestoParcial.substring(0, porcentajeImpuestoParcial.length - 1);
				porcentajeImpuesto = parseFloat(porcentajeImpuesto, 10) / 100;

				var codigoImpuestoAFIP = "";
				var excluirImpuestoAFIP = "F";
				if (!isEmpty(transCodImpuesto)) {
					resultadosImpuestos = nlapiLookupField('salestaxitem', transCodImpuesto, camposImpuestos);
					if (!isEmpty(resultadosImpuestos)) {
						excluirImpuestoAFIP = resultadosImpuestos.custrecord_l54_excluir_proc_txt_cv;
						esPercepcion = resultadosImpuestos.custrecord_l54_es_percepcion;

						if (isEmpty(excluirImpuestoAFIP))
							excluirImpuestoAFIP = 'F';
						if (excluirImpuestoAFIP != 'T')
							codigoImpuestoAFIP = resultadosImpuestos.custrecord_3k_id_impuesto_afip;
					}
				}
				if (!isEmpty(codigoImpuestoAFIP) && (importe_iva!=0 && importe_iva!=0.00)) {
					record.setLineItemValue('item', 'custcol_l54_id_tipo_impuesto', repItem, codigoImpuestoAFIP);
					if (arrayAlicuotas.length > 0) {
						if (arrayAlicuotas.indexOf(codigoImpuestoAFIP) == -1) {
							arrayAlicuotas.push(codigoImpuestoAFIP);
						}
					} else {
						arrayAlicuotas.push(codigoImpuestoAFIP);
					}
				}

				if (!isEmpty(resultadosImpuestos)) {
					var columnaAcumulacion = resultadosImpuestos.custrecord_l54_columna_acumulacion;
					if (!isEmpty(columnaAcumulacion)) {
						record.setLineItemValue('item', 'custcol_l54_col_acumulacion_vtas', repItem, columnaAcumulacion);
					}
					var tipoPercepcion = resultadosImpuestos.custrecord_l54_tipo_percepcion;
					if (!isEmpty(tipoPercepcion)) {
						record.setLineItemValue('item', 'custcol_l54_tipo_percepcion_vtas', repItem, tipoPercepcion);
					}
				}

				var importeNetoNoGravado = 0.00;
				var importeNetoGravado = 0.00;
				var importeExento = 0.00;

				if (importe_iva != 0 && importe_iva != 0.00 && importe_iva != null && importe_iva != '' && esPercepcion == 'F') {
					importeNetoGravado = parseFloat((parseFloat(importeNetoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);

					record.setLineItemValue('item', 'custcol_l54_importe_neto_no_gravado', repItem, importeNetoNoGravado);
					record.setLineItemValue('item', 'custcol_l54_importe_neto_gravado', repItem, importeNetoGravado);
					record.setLineItemValue('item', 'custcol_l54_importe_exento', repItem, importeExento);
				} else {
					if (esPercepcion == 'T') {
						/*if (isEmpty(resultadosImpuestos.custrecord_l54_iva_exento) || resultadosImpuestos.custrecord_l54_iva_exento == 'F') {
							// Es una Percepcion o IVA 0%
							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
							var importeImpuestoPercepcion = 0.00;
							if (importe_neto != 0.00 && importe_neto != 0 && importe_neto != "")
								importeImpuestoPercepcion = parseFloat((parseFloat((importe_neto * tc), 10) * porcentajeImpuesto), 10);
							else
								importeImpuestoPercepcion = parseFloat(parseFloat((importe_iva * tc), 10), 10);

							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat(importeImpuestoPercepcion, 10)), 10);
							
						}*/

						/*else{
						// Es Importe EXENTO
						importeExento=parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
						record.setLineItemValue('item', 'custcol_l54_iva_exento', repItem, 'T');
						}*/
						importeNetoNoGravado = parseFloat(0.00,10);
					} else {
						if (resultadosImpuestos.custrecord_l54_iva_exento != 'T' && impuestoInterno!='T') {
							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
						} else {
							if(impuestoInterno!='T'){
								importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
								record.setLineItemValue('item', 'custcol_l54_iva_exento', repItem, 'T');
							}
						}
					}
					record.setLineItemValue('item', 'custcol_l54_importe_neto_gravado', repItem, importeNetoGravado);
					record.setLineItemValue('item', 'custcol_l54_importe_neto_no_gravado', repItem, importeNetoNoGravado);
					record.setLineItemValue('item', 'custcol_l54_importe_exento', repItem, importeExento);

				}

				if (esPercepcion == 'T') {
					record.setLineItemValue('item', 'custcol_l54_es_percepcion', repItem, 'T');
					if (!isEmpty(taxRate)) {
						if (taxRate.search('%') != -1)
							var porcentajeParaAplicar = taxRate.substring(0, taxRate.length - 1);
						else
							var porcentajeParaAplicar = (parseFloat(taxRate, 10));
						//nlapiLogExecution('DEBUG', 'Actualizar Linea : ' + ' Porcentaje Antes : ' + taxRate + ' Procentaje Despues : ' +  + porcentajeParaAplicar);
						record.setLineItemValue('item', 'custcol_l54_alicuota', repItem, porcentajeParaAplicar);
					}
				}

				nlapiLogExecution('DEBUG', 'actualizarLineasPorIva','Se actualizo la linea de articulos en la Transaccion exitosamente.');
			}
		}

		for (var repExpense = 1; repExpense <= countExpenses; repExpense++) {

			resultadosImpuestos = null;

			var importe_neto = record.getLineItemValue('expense', 'amount', repExpense);
			var importe_iva = record.getLineItemValue('expense', 'tax1amt', repExpense);
			var transCodImpuesto = record.getLineItemValue('expense', 'taxcode', repExpense);
			
			var impuestoInterno = record.getLineItemValue('expense', 'custcol_l54_impuesto_interno', repExpense);
			
			//var taxRate = record.getLineItemValue('expense', 'taxrate1', repExpense);

			//var esPercepcion = record.getLineItemValue('expense', 'custcol_l54_pv_creada', repExpense);
			var esPercepcion = "F";

			var porcentajeImpuestoParcial = record.getLineItemValue('expense', 'taxrate1', repExpense);
			var porcentajeImpuesto = porcentajeImpuestoParcial;
			if (porcentajeImpuestoParcial.search('%') != -1)
				porcentajeImpuesto = porcentajeImpuestoParcial.substring(0, porcentajeImpuestoParcial.length - 1);
			porcentajeImpuesto = parseFloat(porcentajeImpuesto, 10) / 100;

			var codigoImpuestoAFIP = "";
			var excluirImpuestoAFIP = "F";
			if (!isEmpty(transCodImpuesto)) {
				resultadosImpuestos = nlapiLookupField('salestaxitem', transCodImpuesto, camposImpuestos);
				if (!isEmpty(resultadosImpuestos)) {
					excluirImpuestoAFIP = resultadosImpuestos.custrecord_l54_excluir_proc_txt_cv;
					esPercepcion = resultadosImpuestos.custrecord_l54_es_percepcion;
					if (isEmpty(excluirImpuestoAFIP))
						excluirImpuestoAFIP = 'F';
					if (excluirImpuestoAFIP != 'T')
						codigoImpuestoAFIP = resultadosImpuestos.custrecord_3k_id_impuesto_afip;
				}
			}
			if (!isEmpty(codigoImpuestoAFIP) && (importe_iva!=0 && importe_iva!=0.00)) {
				record.setLineItemValue('expense', 'custcol_l54_id_tipo_impuesto', repExpense, codigoImpuestoAFIP);
				if (arrayAlicuotas.length > 0) {
					if (arrayAlicuotas.indexOf(codigoImpuestoAFIP) == -1) {
						arrayAlicuotas.push(codigoImpuestoAFIP);
					}
				} else {
					arrayAlicuotas.push(codigoImpuestoAFIP);
				}
			}

			if (!isEmpty(resultadosImpuestos)) {
				var columnaAcumulacion = resultadosImpuestos.custrecord_l54_columna_acumulacion; ;
				if (!isEmpty(columnaAcumulacion)) {
					record.setLineItemValue('expense', 'custcol_l54_col_acumulacion_vtas', repExpense, columnaAcumulacion);
				}
				var tipoPercepcion = resultadosImpuestos.custrecord_l54_tipo_percepcion;
				if (!isEmpty(tipoPercepcion)) {
					record.setLineItemValue('expense', 'custcol_l54_tipo_percepcion_vtas', repExpense, tipoPercepcion);
				}
			}

			var importeNetoNoGravado = 0.00;
			var importeNetoGravado = 0.00;
			var importeExento = 0.00;

			if (importe_iva != 0 && importe_iva != 0.00 && importe_iva != null && importe_iva != '' && esPercepcion == 'F') {
				importeNetoGravado = parseFloat((parseFloat(importeNetoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);

				record.setLineItemValue('expense', 'custcol_l54_importe_neto_no_gravado', repExpense, importeNetoNoGravado);
				record.setLineItemValue('expense', 'custcol_l54_importe_neto_gravado', repExpense, importeNetoGravado);
				record.setLineItemValue('expense', 'custcol_l54_importe_exento', repExpense, importeExento);
			} else {
				if (esPercepcion == 'T') {
					/*if (isEmpty(resultadosImpuestos.custrecord_l54_iva_exento) || resultadosImpuestos.custrecord_l54_iva_exento == 'F') {
						// Es una Percepcion o IVA 0%
						importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
						var importeImpuestoPercepcion = 0.00;
						if (importe_neto != 0.00 && importe_neto != 0 && importe_neto != "")
							importeImpuestoPercepcion = parseFloat((parseFloat((importe_neto * tc), 10) * porcentajeImpuesto), 10);
						else
							importeImpuestoPercepcion = parseFloat(parseFloat((importe_iva * tc), 10), 10);

						importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat(importeImpuestoPercepcion, 10)), 10);
						
					}*/
					/*else{
					// Es Importe EXENTO
					importeExento=parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
					record.setLineItemValue('expense', 'custcol_l54_iva_exento', repExpense, 'T');
					}*/
					importeNetoNoGravado = parseFloat(0.00,10);
				} else {
					if (resultadosImpuestos.custrecord_l54_iva_exento != 'T' && impuestoInterno!='T') {
							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
						} else {
							if(impuestoInterno!='T'){
								importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
								record.setLineItemValue('expense', 'custcol_l54_iva_exento', repExpense, 'T');
							}
						}
				}
				record.setLineItemValue('expense', 'custcol_l54_importe_neto_gravado', repExpense, importeNetoGravado);
				record.setLineItemValue('expense', 'custcol_l54_importe_neto_no_gravado', repExpense, importeNetoNoGravado);
				record.setLineItemValue('expense', 'custcol_l54_importe_exento', repExpense, importeExento);

			}
			if (esPercepcion == 'T') {
				record.setLineItemValue('expense', 'custcol_l54_es_percepcion', repExpense, 'T');
				/*if(!isEmpty(taxRate)){
				if (taxRate.search('%') != -1)
				var porcentajeParaAplicar = taxRate.substring(0, taxRate.length-1);
				else
				var porcentajeParaAplicar = (parseFloat(taxRate,10) * 100);
				record.setLineItemValue('expense', 'custcol_l54_alicuota', repExpense, porcentajeParaAplicar);
				}*/
			}

			nlapiLogExecution('DEBUG', 'actualizarLineasPorIva','Se actualizo la linea de Gastos en la Transaccion exitosamente.');
		}

		if (arrayAlicuotas.length > 0) {
			record.setFieldValue('custbody_l54_cant_alicuotas', arrayAlicuotas.length);
		} else {
			record.setFieldValue('custbody_l54_cant_alicuotas', 0);
		}

	} catch (e) {
		nlapiLogExecution('ERROR', 'Error guardando la transacciÃ³n y actualizando las lineas.', 'NetSuite error: ' + e.message);
	}

	// --- fin de actualizaciÃ³n de lineas
}

function actualizarLineasPorIvaBeforeSubmit(subsidiaria) {

	// actualizar lineas, tanto items como expenses
	// si la linea de la transacciÃ³n tiene IVA, hay que copiar el campo IMPORTE NETO a NETO GRAVADO
	// si la linea no tiene IVA, hay que copiar IMPORTE NETO a NETO NO GRAVADO

	try {
		var countItems = nlapiGetLineItemCount('item');
		var countExpenses = nlapiGetLineItemCount('expense');
		var tc = nlapiGetFieldValue('exchangerate');
		var arrayAlicuotas = new Array();
		var proceso = 'actualizarLineasPorIvaBeforeSubmit';

		var camposImpuestos = ['custrecord_l54_excluir_proc_txt_cv', 'custrecord_3k_id_impuesto_afip', 'custrecord_l54_columna_acumulacion', 'custrecord_l54_tipo_percepcion', 'custrecord_l54_iva_exento', 'custrecord_l54_es_percepcion','custrecord_l54_otro_tributo'];

		var resultadosImpuestos = null;
		var resultsSalexTaxItem = getResultsSalesTaxItem(subsidiaria);
        var arregloCodigosImpuestos = null;

        if (!isEmpty(resultsSalexTaxItem) && !resultsSalexTaxItem.error && resultsSalexTaxItem.infoResultados.length > 0) {
            // Asigno los resultados de la búsqueda de códigos de impuestos
            arregloCodigosImpuestos = resultsSalexTaxItem.infoResultados;
        } else {
            nlapiLogExecution('ERROR', proceso, 'LINE 1414 - resultsSalexTaxItem.error: ' + resultsSalexTaxItem.error + ' - resultsSalexTaxItem.mensaje: ' + resultsSalexTaxItem.mensaje);
        }

		for (var repItem = 1; repItem <= countItems; repItem++) {

			resultadosImpuestos = null;

			var importe_neto = nlapiGetLineItemValue('item', 'amount', repItem);
			var importe_iva = nlapiGetLineItemValue('item', 'tax1amt', repItem);
			var transCodImpuesto = nlapiGetLineItemValue('item', 'taxcode', repItem);
			var taxRate = nlapiGetLineItemValue('item', 'taxrate1', repItem);
			var tipoItem = nlapiGetLineItemValue('item', 'itemtype', repItem);
			var impuestoInterno = nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', repItem);

			if (tipoItem != "Subtotal" && tipoItem != "Description") {

				//var esPercepcion = record.getLineItemValue('item', 'custcol_l54_pv_creada', repItem);
				var esPercepcion = "F";
				var esOtroTributo = "F";

				var porcentajeImpuestoParcial = nlapiGetLineItemValue('item', 'taxrate1', repItem);
				var porcentajeImpuesto = porcentajeImpuestoParcial;
				if (porcentajeImpuestoParcial.search('%') != -1)
					porcentajeImpuesto = porcentajeImpuestoParcial.substring(0, porcentajeImpuestoParcial.length - 1);
				porcentajeImpuesto = parseFloat(porcentajeImpuesto, 10) / 100;

				var codigoImpuestoAFIP = "";
				var excluirImpuestoAFIP = "F";
				if (!isEmpty(transCodImpuesto)) {
					resultadosImpuestos = obtener_impuesto(arregloCodigosImpuestos,transCodImpuesto);
					if (!isEmpty(resultadosImpuestos)) {
						excluirImpuestoAFIP = resultadosImpuestos.custrecord_l54_excluir_proc_txt_cv;
						esPercepcion = resultadosImpuestos.custrecord_l54_es_percepcion;
						esOtroTributo = resultadosImpuestos.custrecord_l54_otro_tributo;

						if (isEmpty(excluirImpuestoAFIP))
							excluirImpuestoAFIP = 'F';
						if (excluirImpuestoAFIP != 'T')
							codigoImpuestoAFIP = resultadosImpuestos.custrecord_3k_id_impuesto_afip;
						if (isEmpty(esOtroTributo))
							esOtroTributo = 'F';
					}
				}
				if (!isEmpty(codigoImpuestoAFIP) && (importe_iva!=0 && importe_iva!=0.00)) {
					nlapiSetLineItemValue('item', 'custcol_l54_id_tipo_impuesto', repItem, codigoImpuestoAFIP);
					if (arrayAlicuotas.length > 0) {
						if (arrayAlicuotas.indexOf(codigoImpuestoAFIP) == -1) {
							arrayAlicuotas.push(codigoImpuestoAFIP);
						}
					} else {
						arrayAlicuotas.push(codigoImpuestoAFIP);
					}
				}

				if (!isEmpty(resultadosImpuestos)) {
					var columnaAcumulacion = resultadosImpuestos.custrecord_l54_columna_acumulacion;
					if (!isEmpty(columnaAcumulacion)) {
						nlapiSetLineItemValue('item', 'custcol_l54_col_acumulacion_vtas', repItem, columnaAcumulacion);
					}
					var tipoPercepcion = resultadosImpuestos.custrecord_l54_tipo_percepcion;
					if (!isEmpty(tipoPercepcion)) {
						nlapiSetLineItemValue('item', 'custcol_l54_tipo_percepcion_vtas', repItem, tipoPercepcion);
					}
				}

				var importeNetoNoGravado = 0.00;
				var importeNetoGravado = 0.00;
				var importeExento = 0.00;

				if (importe_iva != 0 && importe_iva != 0.00 && importe_iva != null && importe_iva != '' && esPercepcion == 'F') {
					importeNetoGravado = parseFloat((parseFloat(importeNetoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);

					nlapiSetLineItemValue('item', 'custcol_l54_importe_neto_no_gravado', repItem, importeNetoNoGravado);
					nlapiSetLineItemValue('item', 'custcol_l54_importe_neto_gravado', repItem, importeNetoGravado);
					nlapiSetLineItemValue('item', 'custcol_l54_importe_exento', repItem, importeExento);
				} else {
					if (esPercepcion == 'T') {
						/*if (isEmpty(resultadosImpuestos.custrecord_l54_iva_exento) || resultadosImpuestos.custrecord_l54_iva_exento == 'F') {
							// Es una Percepcion o IVA 0%
							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
							var importeImpuestoPercepcion = 0.00;
							if (importe_neto != 0.00 && importe_neto != 0 && importe_neto != "")
								importeImpuestoPercepcion = parseFloat((parseFloat((importe_neto * tc), 10) * porcentajeImpuesto), 10);
							else
								importeImpuestoPercepcion = parseFloat(parseFloat((importe_iva * tc), 10), 10);

							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat(importeImpuestoPercepcion, 10)), 10);
							
						}*/

						/*else{
						// Es Importe EXENTO
						importeExento=parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
						record.setLineItemValue('item', 'custcol_l54_iva_exento', repItem, 'T');
						}*/
						importeNetoNoGravado = parseFloat(0.00,10);
					} else {
						if (!isEmpty(resultadosImpuestos) && resultadosImpuestos.custrecord_l54_iva_exento != 'T' && impuestoInterno!='T') {
							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
						} else {
							if(impuestoInterno!='T'){
								importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
								nlapiSetLineItemValue('item', 'custcol_l54_iva_exento', repItem, 'T');
							}
						}
					}
					nlapiSetLineItemValue('item', 'custcol_l54_importe_neto_gravado', repItem, importeNetoGravado);
					nlapiSetLineItemValue('item', 'custcol_l54_importe_neto_no_gravado', repItem, importeNetoNoGravado);
					nlapiSetLineItemValue('item', 'custcol_l54_importe_exento', repItem, importeExento);

				}

				if (esPercepcion == 'T') {
					nlapiSetLineItemValue('item', 'custcol_l54_es_percepcion', repItem, 'T');
					if (!isEmpty(taxRate)) {
						if (taxRate.search('%') != -1)
							var porcentajeParaAplicar = taxRate.substring(0, taxRate.length - 1);
						else
							var porcentajeParaAplicar = (parseFloat(taxRate, 10));
						//nlapiLogExecution('DEBUG', 'Actualizar Linea : ' + ' Porcentaje Antes : ' + taxRate + ' Procentaje Despues : ' +  + porcentajeParaAplicar);
						nlapiSetLineItemValue('item', 'custcol_l54_alicuota', repItem, porcentajeParaAplicar);
					}
				}

				if (esOtroTributo == 'T')
					nlapiSetLineItemValue('item', 'custcol_l54_otros_tributos', repItem, 'T');

				// nlapiLogExecution('DEBUG', 'actualizarLineasPorIva','Se actualizo la linea de articulos en la Transaccion exitosamente.');
			}
		}

		for (var repExpense = 1; repExpense <= countExpenses; repExpense++) {

			resultadosImpuestos = null;
			var importe_neto = nlapiGetLineItemValue('expense', 'amount', repExpense);
			var importe_iva = nlapiGetLineItemValue('expense', 'tax1amt', repExpense);
			var transCodImpuesto = nlapiGetLineItemValue('expense', 'taxcode', repExpense);
			
			var impuestoInterno = nlapiGetLineItemValue('expense', 'custcol_l54_impuesto_interno', repExpense);
			
			//var taxRate = record.getLineItemValue('expense', 'taxrate1', repExpense);

			//var esPercepcion = record.getLineItemValue('expense', 'custcol_l54_pv_creada', repExpense);
			var esPercepcion = "F";

			var porcentajeImpuestoParcial = nlapiGetLineItemValue('expense', 'taxrate1', repExpense);
			var porcentajeImpuesto = porcentajeImpuestoParcial;
			if (porcentajeImpuestoParcial.search('%') != -1)
				porcentajeImpuesto = porcentajeImpuestoParcial.substring(0, porcentajeImpuestoParcial.length - 1);
			porcentajeImpuesto = parseFloat(porcentajeImpuesto, 10) / 100;

			var codigoImpuestoAFIP = "";
			var excluirImpuestoAFIP = "F";
			if (!isEmpty(transCodImpuesto)) {
				resultadosImpuestos = obtener_impuesto(arregloCodigosImpuestos,transCodImpuesto);
				if (!isEmpty(resultadosImpuestos)) {
					excluirImpuestoAFIP = resultadosImpuestos.custrecord_l54_excluir_proc_txt_cv;
					esPercepcion = resultadosImpuestos.custrecord_l54_es_percepcion;
					if (isEmpty(excluirImpuestoAFIP))
						excluirImpuestoAFIP = 'F';
					if (excluirImpuestoAFIP != 'T')
						codigoImpuestoAFIP = resultadosImpuestos.custrecord_3k_id_impuesto_afip;
				}
			}
			if (!isEmpty(codigoImpuestoAFIP) && (importe_iva!=0 && importe_iva!=0.00)) {
				nlapiSetLineItemValue('expense', 'custcol_l54_id_tipo_impuesto', repExpense, codigoImpuestoAFIP);
				if (arrayAlicuotas.length > 0) {
					if (arrayAlicuotas.indexOf(codigoImpuestoAFIP) == -1) {
						arrayAlicuotas.push(codigoImpuestoAFIP);
					}
				} else {
					arrayAlicuotas.push(codigoImpuestoAFIP);
				}
			}

			if (!isEmpty(resultadosImpuestos)) {
				var columnaAcumulacion = resultadosImpuestos.custrecord_l54_columna_acumulacion; ;
				if (!isEmpty(columnaAcumulacion)) {
					nlapiSetLineItemValue('expense', 'custcol_l54_col_acumulacion_vtas', repExpense, columnaAcumulacion);
				}
				var tipoPercepcion = resultadosImpuestos.custrecord_l54_tipo_percepcion;
				if (!isEmpty(tipoPercepcion)) {
					nlapiSetLineItemValue('expense', 'custcol_l54_tipo_percepcion_vtas', repExpense, tipoPercepcion);
				}
			}

			var importeNetoNoGravado = 0.00;
			var importeNetoGravado = 0.00;
			var importeExento = 0.00;

			if (importe_iva != 0 && importe_iva != 0.00 && importe_iva != null && importe_iva != '' && esPercepcion == 'F') {
				importeNetoGravado = parseFloat((parseFloat(importeNetoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);

				nlapiSetLineItemValue('expense', 'custcol_l54_importe_neto_no_gravado', repExpense, importeNetoNoGravado);
				nlapiSetLineItemValue('expense', 'custcol_l54_importe_neto_gravado', repExpense, importeNetoGravado);
				nlapiSetLineItemValue('expense', 'custcol_l54_importe_exento', repExpense, importeExento);
			} else {
				if (esPercepcion == 'T') {
					/*if (isEmpty(resultadosImpuestos.custrecord_l54_iva_exento) || resultadosImpuestos.custrecord_l54_iva_exento == 'F') {
						// Es una Percepcion o IVA 0%
						importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
						var importeImpuestoPercepcion = 0.00;
						if (importe_neto != 0.00 && importe_neto != 0 && importe_neto != "")
							importeImpuestoPercepcion = parseFloat((parseFloat((importe_neto * tc), 10) * porcentajeImpuesto), 10);
						else
							importeImpuestoPercepcion = parseFloat(parseFloat((importe_iva * tc), 10), 10);

						importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat(importeImpuestoPercepcion, 10)), 10);
						
					}*/
					/*else{
					// Es Importe EXENTO
					importeExento=parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
					record.setLineItemValue('expense', 'custcol_l54_iva_exento', repExpense, 'T');
					}*/
					importeNetoNoGravado = parseFloat(0.00,10);
				} else {
					if (!isEmpty(resultadosImpuestos) && resultadosImpuestos.custrecord_l54_iva_exento != 'T' && impuestoInterno!='T') {
							importeNetoNoGravado = parseFloat((parseFloat(importeNetoNoGravado, 10) + parseFloat((importe_neto * tc), 10)), 10);
						} else {
							if(impuestoInterno!='T'){
								importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((importe_neto * tc), 10)), 10);
								nlapiSetLineItemValue('expense', 'custcol_l54_iva_exento', repExpense, 'T');
							}
						}
				}
				nlapiSetLineItemValue('expense', 'custcol_l54_importe_neto_gravado', repExpense, importeNetoGravado);
				nlapiSetLineItemValue('expense', 'custcol_l54_importe_neto_no_gravado', repExpense, importeNetoNoGravado);
				nlapiSetLineItemValue('expense', 'custcol_l54_importe_exento', repExpense, importeExento);

			}
			if (esPercepcion == 'T') {
				nlapiSetLineItemValue('expense', 'custcol_l54_es_percepcion', repExpense, 'T');
				/*if(!isEmpty(taxRate)){
				if (taxRate.search('%') != -1)
				var porcentajeParaAplicar = taxRate.substring(0, taxRate.length-1);
				else
				var porcentajeParaAplicar = (parseFloat(taxRate,10) * 100);
				record.setLineItemValue('expense', 'custcol_l54_alicuota', repExpense, porcentajeParaAplicar);
				}*/
			}

			// nlapiLogExecution('DEBUG', 'actualizarLineasPorIva','Se actualizo la linea de Gastos en la Transaccion exitosamente.');
		}
		
		// INICIO - NUEVO PARA COSTOS DE ENVIO
		var importeNetoGravadoEnvio=parseFloat(0.00,10).toFixedOK(2);
		var importeNetoNoGravadoEnvio=parseFloat(0.00,10).toFixedOK(2);
		var importeExentoEnvio=parseFloat(0.00,10).toFixedOK(2);
		var EsEnvioExento='F';
		var IDEnvioAFIP='';
		var importeImpuestoEnvio=parseFloat(0.00,10).toFixedOK(2);
		var tasaImpuestoEnvio=0;
		var columnaAcumulacionImpEnvio='';
		
		var costoEnvio = nlapiGetFieldValue('shippingcost');
		if (costoEnvio != 0.00 && costoEnvio != 0 && costoEnvio != ""){
			var tipoImpEnvio = nlapiGetFieldValue('shippingtaxcode');
			if(!isEmpty(tipoImpEnvio)){
				// Busco el Tipo de Impuesto
				var esNoGravado = false;
				var esPercepcion = false;
				var esIVAExento = false;
				var tipoPercepcion = "";

				resultadosImpuestos = null;
				resultadosImpuestos = obtener_impuesto(arregloCodigosImpuestos,tipoImpEnvio);
				if (!isEmpty(resultadosImpuestos)) {
					excluirImpuestoAFIP = resultadosImpuestos.custrecord_l54_excluir_proc_txt_cv;
					esIVAExento = resultadosImpuestos.custrecord_l54_iva_exento;
					if(esIVAExento=='T')
						esIVAExento=true;
					if(!isEmpty(resultadosImpuestos.custrecord_l54_columna_acumulacion))
						columnaAcumulacionImpEnvio = resultadosImpuestos.custrecord_l54_columna_acumulacion;
					if (isEmpty(excluirImpuestoAFIP))
						excluirImpuestoAFIP = 'F';
					if (excluirImpuestoAFIP != 'T')
						codigoImpuestoAFIP = resultadosImpuestos.custrecord_3k_id_impuesto_afip;
				}
						
				if (!isEmpty(codigoImpuestoAFIP)) {
					IDEnvioAFIP = codigoImpuestoAFIP;
					if (arrayAlicuotas.length > 0) {
						if (arrayAlicuotas.indexOf(codigoImpuestoAFIP) == -1) {
							arrayAlicuotas.push(codigoImpuestoAFIP);
						}
					} else {
						arrayAlicuotas.push(codigoImpuestoAFIP);
					}
				}

				var porcentajeImpEnvio = nlapiGetFieldValue('shippingtax1rate');
				tasaImpuestoEnvio = porcentajeImpEnvio;
				var porcentajeImpEnvioFinal=0;
				if(!isEmpty(porcentajeImpEnvio)){
					porcentajeImpEnvioFinal = parseFloat((parseFloat(porcentajeImpEnvio, 10) / 100),10);
				}
				
				if (porcentajeImpEnvioFinal == 0.00 || porcentajeImpEnvioFinal == 0 || porcentajeImpEnvioFinal == null) {
					if (esIVAExento == true) {
						// SI ES IVA EXENTO
						importeExentoEnvio = parseFloat((costoEnvio), 10).toFixedOK(2);
						EsEnvioExento='T';
					} else {
						// Si es IVA NO GRAVADO
						importeNetoNoGravadoEnvio = parseFloat((costoEnvio), 10).toFixedOK(2);
					}
				} else {
					importeNetoGravadoEnvio = parseFloat((costoEnvio), 10).toFixedOK(2);
					// Calculo el Importe de Impuesto de Envio
					importeImpuestoEnvio = parseFloat(parseFloat(importeNetoGravadoEnvio,10)*parseFloat(porcentajeImpEnvioFinal,10),10).toFixedOK(2);
				}
				
			} else{
				importeNetoNoGravadoEnvio = parseFloat((costoEnvio), 10).toFixedOK(2);
			}
		}
	
		nlapiSetFieldValue('custbody_l54_id_imp_afip_envio', IDEnvioAFIP);
		nlapiSetFieldValue('custbody_l54_col_acum_imp_env', columnaAcumulacionImpEnvio);
		nlapiSetFieldValue('custbody_l54_tasa_imp_envio', tasaImpuestoEnvio);
		nlapiSetFieldValue('custbody_l54_es_imp_exento_envio', EsEnvioExento);
		nlapiSetFieldValue('custbody_l54_imp_n_grav_envio', importeNetoGravadoEnvio);
		nlapiSetFieldValue('custbody_l54_imp_n_ngrav_envio', importeNetoNoGravadoEnvio);
		nlapiSetFieldValue('custbody_l54_imp_impuesto_envio', importeImpuestoEnvio);
		nlapiSetFieldValue('custbody_l54_imp_exento_envio', importeExentoEnvio);
		
		// FIN - NUEVO PARA COSTOS DE ENVIO

		if (arrayAlicuotas.length > 0) {
			nlapiSetFieldValue('custbody_l54_cant_alicuotas', arrayAlicuotas.length);
		} else {
			nlapiSetFieldValue('custbody_l54_cant_alicuotas', 0);
		}

	} catch (e) {
		nlapiLogExecution('ERROR', 'Error guardando la transacciÃ³n y actualizando las lineas.', 'NetSuite error: ' + e.message);
	}

	// --- fin de actualizaciÃ³n de lineas
}

function getResultsSalesTaxItem(subsidiaria) {

	var proceso = 'getResultsSalesTaxItem';
	var response = { error: false, mensaje: '', infoResultados: [] };

	try {
		nlapiLogExecution('DEBUG', proceso, 'INICIO getResultsSalesTaxItem - subsidiaria: ' + subsidiaria);
		
		var search = new nlapiLoadSearch('salestaxitem', 'customsearch_l54_codigos_imp_circ_ventas');
		
		if (!isEmpty(subsidiaria)) {
			var filtros = [];
			filtros[0] = new nlobjSearchFilter('subsidiary', null, 'anyof', subsidiaria);
			search.addFilters(filtros);
		}

		var searchResults = search.runSearch();
		var columns = searchResults.getColumns();
		var resultadoTaxCodes = [];

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
					resultadoTaxCodes = resultado; //Primera ve inicializa
				else
					resultadoTaxCodes = resultadoTaxCodes.concat(resultado);
			}

			// increase pointer
			resultIndex = resultIndex + resultStep;

			// once no records are returned we already got all of them
		} while (!isEmpty(resultado) && resultado.length > 0)

		if (!isEmpty(resultadoTaxCodes) && resultadoTaxCodes.length > 0) {
			for (var i = 0; i < resultadoTaxCodes.length; i++) {
				var info = {};
				info.impuesto = resultadoTaxCodes[i].getValue(columns[0]);
				info.excluirProcTXT = resultadoTaxCodes[i].getValue(columns[2]);
				info.idAFIP = resultadoTaxCodes[i].getValue(columns[3]);
				info.colAcumulacion = resultadoTaxCodes[i].getValue(columns[4]);
				info.tipoPercepcion = resultadoTaxCodes[i].getValue(columns[5]);				
				info.IVAExento = resultadoTaxCodes[i].getValue(columns[6]);
				info.esPercepcion = resultadoTaxCodes[i].getValue(columns[7]);
				info.esOtroTributo = resultadoTaxCodes[i].getValue(columns[8]);
				response.infoResultados.push(info);
			}
		} else {
			nlapiLogExecution('ERROR', proceso, 'No se encontró ningún resultado de código de impuesto para la subsidiaria: ' + subsidiaria);
		}
	} catch (error) {
		response.error = true;
		response.mensaje = 'Error NetSuite - Excepción mientras se obtenían los códigos de impuestos - Detalles: ' + error.message;
		nlapiLogExecution('ERROR', proceso, response.mensaje);
	}

	nlapiLogExecution('DEBUG', proceso, 'FIN getResultsSalesTaxItem - response: ' + JSON.stringify(response));
	return response;
}

function numeradorAUtilizarSS(tipoTransNetSuite, esND, subsidiaria) {

	/*SU 20150713 - Modificacion para validar que los Criterios no sean NULL*/
	if (!isEmpty(tipoTransNetSuite)) {

		var columns = [new nlobjSearchColumn("custrecord_l54_tipo_trans_l54")];

		var filters = new Array();
		filters[0] = new nlobjSearchFilter('custrecord_l54_tipo_trans_netsuite', null, 'is', tipoTransNetSuite);
		filters[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F');

		if (!isEmpty(esND))
			filters[2] = new nlobjSearchFilter('custrecord_l54_es_nd', null, 'is', esND);
		else
			filters[2] = new nlobjSearchFilter('custrecord_l54_es_nd', null, 'is', 'F');

		if (!isEmpty(subsidiaria))
			filters[3] = new nlobjSearchFilter('custrecord_l54_num_trans_subsidiaria', null, 'anyof', subsidiaria);

		var results = nlapiSearchRecord('customrecord_l54_numerador_transaccion', null, filters, columns);

		if (results != null && results.length > 0)
			return results[0].getValue('custrecord_l54_tipo_trans_l54');
	}

	return null;
}

function getMontoPercepcionesSS(id_vendorbill) {

	var monto_percepciones = 0;
	var monto_percepciones_linea = 0;
	var registro = nlapiLoadRecord(nlapiLookupField('transaction', id_vendorbill, 'recordtype'), id_vendorbill);
	var tasa_cambio = parseFloat(registro.getFieldValue('exchangerate'));
	var reps = registro.getLineItemCount('expense');

	for (var rep = 1; rep <= reps; rep++) {

		if (registro.getLineItemValue('expense', 'custcol_l54_percepciones', rep) != null) {

			monto_percepciones_linea = parseFloat(registro.getLineItemValue('expense', 'amount', rep)) * tasa_cambio;
			monto_percepciones += monto_percepciones_linea;
		}
	}

	return monto_percepciones;
}

function obtenerNetoBillAplicados(recVendorpayment) {

	var importe_neto_factura_proveedor_a_pagar = 0;
	var numberOfApply = recVendorpayment.getLineItemCount('apply');

	// recorro todas las facturas aplicadas en este pago
	for (var j = 1; j <= numberOfApply; j++) {

		if (recVendorpayment.getLineItemValue('apply', 'apply', j) == "T") {

			var id_vendorbill = recVendorpayment.getLineItemValue('apply', 'doc', j);

			var record_vendorbill = nlapiLoadRecord(nlapiLookupField('transaction', id_vendorbill, 'recordtype'), id_vendorbill);
			var codigo_retencion_ganancias = record_vendorbill.getFieldValue('custbody_l54_cod_ret_gan');
			var codigo_retencion_suss = record_vendorbill.getFieldValue('custbody_l54_cod_ret_suss');
			var codigo_retencion_iva = record_vendorbill.getFieldValue('custbody_l54_cod_ret_iva');
			var codigo_retencion_iibb = record_vendorbill.getFieldValue('custbody_l54_cod_ret_iibb');

			var importe_bruto_factura_proveedor = 0;
			var impuestos = 0;

			var id_vendorbill = recVendorpayment.getLineItemValue('apply', 'doc', j);

			if (codigo_retencion_ganancias != '' || codigo_retencion_suss != '' || codigo_retencion_iibb != '' || codigo_retencion_iva != '') {

				//tasa_cambio = parseFloat(record_vendorbill.getFieldValue('exchangerate'));
				//importe_bruto_factura_proveedor	= parseFloat(record_vendorbill.getFieldValue('total')) * tasa_cambio;
				importe_bruto_factura_proveedor = parseFloat(record_vendorbill.getFieldValue('total'));
				impuestos = parseFloat(record_vendorbill.getFieldValue('taxtotal'));

				var importe_neto_factura_proveedor = parseFloat(importe_bruto_factura_proveedor - impuestos - getMontoPercepcionesSS(id_vendorbill));
				// me quedo con el importe de la factura o el importe parcial de la factura => IMPORTE NETO
				//var importe_bruto_factura_proveedor_a_pagar = parseFloat(recVendorpayment.getLineItemValue('apply', 'amount', j)) * tasa_cambio;
				var importe_bruto_factura_proveedor_a_pagar = parseFloat(recVendorpayment.getLineItemValue('apply', 'amount', j));
				var coeficiente = importe_bruto_factura_proveedor / importe_neto_factura_proveedor;

				nlapiLogExecution('DEBUG', 'VARIABLES TMP.', 'VARIABLES: ' + 'importe_bruto_factura_proveedor: ' + importe_bruto_factura_proveedor + 'impuestos: ' + impuestos);

				importe_neto_factura_proveedor_a_pagar += (importe_bruto_factura_proveedor_a_pagar / coeficiente);
			}
		}
	}

	return importe_neto_factura_proveedor_a_pagar;
}

// -------------------------------------------------------------------------
// -------------------------------------------------------------------------
// METODOS COMUNES PARA INVOICE Y CREDIT MEMO

/*function l54beforeSubmitTransaction(type){

if (type == 'create'){

var esND = nlapiGetFieldValue('custbody_l54_nd');
var tipoTransStr = nlapiGetRecordType();
var bocaId = nlapiGetFieldValue("custbody_l54_boca");
var letraId = nlapiGetFieldValue("custbody_l54_letra");

// si se utiliza numerador automatico
if ( nlapiGetFieldValue('custbody_l54_numerador_manual') == 'F' && isEmpty(nlapiGetFieldValue('custbody_l54_numero_localizado'))){

if (esOneworld())
var subsidiaria = nlapiGetFieldValue('subsidiary');
else
var subsidiaria = null;

var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
var numeradorArray = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria);

nlapiSetFieldValue("custbody_l54_numero", numeradorArray['numerador']);
nlapiSetFieldValue("custbody_l54_numero_localizado", numeradorArray['numeradorPrefijo']);
}
}

if (type == 'create' || type == 'edit'){

var total = nlapiGetFieldValue('total');
var numeroEnLetras = getNumeroEnLetras(total);

if (!isEmpty(numeroEnLetras)){

nlapiSetFieldValue ("custbody_l54_monto_escrito", numeroEnLetras);
}

// actualizaciÃ³n de lineas por IVA
actualizarLineasPorIva();
}
}*/

function calcularPercepcionesVentasAfterSubmit(record) {

	if (!isEmpty(record)) {
		// Nuevo INICIO - Calculo de Percepiones en Ventas
		// elimino las lineas de percepciones ventas que estaban generadas en esta transacciÃ³n
		var numberOfItems = record.getLineItemCount('item');

		for (var r = 1; r <= record.getLineItemCount('item'); r++) {
			if (record.getLineItemValue('item', 'custcol_l54_pv_creada', r) == 'T') {
				//record.selectLineItem("item", r);
				record.removeLineItem("item", r);
				r--;
			}
		}

		// Obtengo informacion de la Transaccion

		var clienteTransaccion = record.getFieldValue('entity');
		//var jurisdiccionTransaccion = nlapiGetFieldValue('custbody_l54_zona_impuestos');
		//var jurisdiccionEntrega = nlapiGetFieldValue('custbody_l54_lugar_entrega');
		var total = record.getFieldValue('total');
		var subsidiariaTransacicon = null;
		var esOneWorld = esOneworld();
		var subsidiariaTransaciconText = "";
		if (esOneWorld) {
			subsidiariaTransacicon = record.getFieldValue('subsidiary');
			subsidiariaTransaciconText = record.getFieldValue('subsidiary');
		}

		// Inicio Llamar a SuiteLet para el Calculo de las Percepciones en VENTAS
		var informacionTransaccion = new Object();
		informacionTransaccion.cliente = clienteTransaccion;
		informacionTransaccion.total = total;
		informacionTransaccion.subsidiaria = subsidiariaTransacicon;
		informacionTransaccion.subsidiariaText = subsidiariaTransaciconText;
		informacionTransaccion.esOneWorld = esOneWorld;
		// INICIO Nuevo - Considerar Jurisdiccion de Entrega
		var jurisdiccionEntrega=record.getFieldValue('custbody_l54_zona_impuestos');
		var jurisdiccionEntregaText=record.getFieldText('custbody_l54_zona_impuestos');
		informacionTransaccion.jurisdiccionEntrega = '';
		informacionTransaccion.jurisdiccionEntregaText = '';
		if(!isEmpty(jurisdiccionEntrega)){
			informacionTransaccion.jurisdiccionEntrega = jurisdiccionEntrega;
			informacionTransaccion.jurisdiccionEntregaText = jurisdiccionEntregaText;
		}
		// FIN Nuevo - Considerar Jurisdiccion de Entrega
		informacionTransaccion.articulos = new Array();

		// Inicio Obtener Informacion de los Articulos
		var contadorArticulos = 0;

		var numberOfItems = record.getLineItemCount('item');

		for (var i = 1; numberOfItems != null && i <= numberOfItems; i++) {

			var item = record.getLineItemValue('item', 'item', i);
			var cantidad = record.getLineItemValue('item', 'quantity', i);
			var itemImporte = record.getLineItemValue('item', 'amount', i);
			var itemBienDeUso = record.getLineItemValue('item', 'custcol_l54_pv_bien_de_uso', i);

			// Preguntar por Cantidad > 0 para no incluir Articulos de Descripcion,Subtotal,etc
			if ((itemBienDeUso == 'F' || itemBienDeUso == '' || isEmpty(itemBienDeUso)) && !isEmpty(itemImporte) && !isEmpty(cantidad) && cantidad > 0) {
				informacionTransaccion.articulos[contadorArticulos] = new Object();
				informacionTransaccion.articulos[contadorArticulos].idArticulo = item;
				informacionTransaccion.articulos[contadorArticulos].importeArticulo = itemImporte;
				contadorArticulos = parseInt(contadorArticulos, 10) + parseInt(1, 10);
			}

		}
		// Fin Obtener Informacion de los Articulos

		if (!isEmpty(numberOfItems) && numberOfItems > 0 && !isEmpty(contadorArticulos) && contadorArticulos > 0) {

			var objInformacionTransaccion = new Array();

			var informacionTransaccionJson = JSON.stringify(informacionTransaccion);
			objInformacionTransaccion['informacionTransaccion'] = informacionTransaccionJson;

			try {
				nlapiLogExecution('DEBUG', 'Calculo Percepiones', 'INICIO llamada SuiteLet');
				var strURL = nlapiResolveURL('SUITELET', 'customscript_l54_cal_percepciones_ventas', 'customdeploy_l54_cal_percepciones_ventas', true);
				nlapiLogExecution('DEBUG', 'Calculo Percepiones', 'FIN llamada SuiteLet');
				var objRta = nlapiRequestURL(strURL, objInformacionTransaccion, null, null);

				if (!isEmpty(objRta)) {
					var informacionPercepciones = JSON.parse(objRta.getBody());
					//nlapiLogExecution('DEBUG', 'Calculo Percepiones','RESP : ' + JSON.stringify(informacionPercepciones));
					if (!isEmpty(informacionPercepciones)) {
						if (informacionPercepciones.error == false) {
							// Inicio Grabar Informacion de las Percepciones en la Transaccion
							if (informacionPercepciones.infoPercepciones != null && informacionPercepciones.infoPercepciones.length > 0) {
								// elimino las lineas de percepciones ventas que estaban generadas en esta transacciÃ³n
								var numberOfItems = record.getLineItemCount('item');

								for (var r = 1; r <= record.getLineItemCount('item'); r++) {
									if (nlapiGetLineItemValue('item', 'custcol_l54_pv_creada', r) == 'T') {
										//record.selectLineItem("item", r);
										record.removeLineItem("item", r);
										r--;
									}
								}

								for (var i = 0; i < informacionPercepciones.infoPercepciones.length; i++) {

									record.selectNewLineItem('item');
									record.setCurrentLineItemValue('item', 'item', informacionPercepciones.infoPercepciones[i].item);
									record.setCurrentLineItemValue('item', 'description', informacionPercepciones.infoPercepciones[i].descripcion);
									record.setCurrentLineItemValue('item', 'quantity', informacionPercepciones.infoPercepciones[i].cantidad);
									record.setCurrentLineItemValue('item', 'rate', informacionPercepciones.infoPercepciones[i].importeUnitario);
									record.setCurrentLineItemValue('item', 'amount', informacionPercepciones.infoPercepciones[i].importeTotal);
									record.setCurrentLineItemValue('item', 'taxcode', informacionPercepciones.infoPercepciones[i].codigoImpuesto);
									// Nuevo - Grabar Procentaje de Impuesto
									record.setCurrentLineItemValue('item', 'taxrate1', informacionPercepciones.infoPercepciones[i].porcentaje);
									record.setCurrentLineItemValue('item', 'custcol_l54_jurisd_iibb_lineas', informacionPercepciones.infoPercepciones[i].jurisdiccion);
									record.setCurrentLineItemValue('item', 'custcol_l54_pv_creada', informacionPercepciones.infoPercepciones[i].procesoPV);
									record.setCurrentLineItemValue('item', 'tax1amt', informacionPercepciones.infoPercepciones[i].importeImpuesto);
									record.setCurrentLineItemValue('item', 'custcol_l54_monto_imp_perc', informacionPercepciones.infoPercepciones[i].montoImponible);
									// Nuevo - Grabar Norma IIBB
									record.setCurrentLineItemValue('item', 'custcol_l54_norma_iibb_perc', informacionPercepciones.infoPercepciones[i].normaIIBB);
									// Nuevo - Grabar Tipo Contribuyente IIBB
									record.setCurrentLineItemValue('item', 'custcol_l54_tipo_contribuyente', informacionPercepciones.infoPercepciones[i].tipoContribuyenteIIBB);
									// Nuevo - Grabar Campo Alicuota
									record.setCurrentLineItemValue('item', 'custcol_l54_alicuota', informacionPercepciones.infoPercepciones[i].porcentaje);
									//alert("Alicuota : " + informacionPercepciones.infoPercepciones[i].porcentaje + " Norma IIBB : " + informacionPercepciones.infoPercepciones[i].normaIIBB);
									record.commitLineItem('item');

								}

							}
							// Fin Grabar Informacion de las Percepciones en la Transaccion
							// Informo Warnings
							var mensajeWarning = 'Aviso : \n ';
							if (informacionPercepciones.warning == true) {
								for (var i = 0; informacionPercepciones.mensajeWarning != null && i < informacionPercepciones.mensajeWarning.length; i++) {
									mensajeWarning += ((i + 1) + ' - ' + informacionPercepciones.mensajeWarning[i] + '\n');
								}
								nlapiLogExecution('DEBUG', 'Calculo Percepiones', 'Warning Calculo Percepiones en Ventas : ' + mensajeWarning);
								//alert(mensajeWarning);
							}

							// Muestro el Mensaje de Finalizacion
							//alert(informacionPercepciones.mensajeOk);
							nlapiLogExecution('DEBUG', 'Calculo Percepiones', 'Se Calcularon las Percepiones en Ventas Correctamente - Mensaje : ' + informacionPercepciones.mensajeOk);
						} else {
							// Muestro el Error
							var erroresCalculoPercepciones = "";
							if (informacionPercepciones.mensajeError != null && informacionPercepciones.mensajeError.length == 1) {
								erroresCalculoPercepciones = informacionPercepciones.mensajeError[0];
							} else {
								for (var i = 0; informacionPercepciones.mensajeError != null && i < informacionPercepciones.mensajeError.length; i++) {
									erroresCalculoPercepciones += informacionPercepciones.mensajeError[i] + '\n';
								}
							}
							nlapiLogExecution('ERROR', 'Calculo Percepiones', 'Error Calculando PV - Error : ' + erroresCalculoPercepciones);
						}
					} else {
						nlapiLogExecution('ERROR', 'Calculo Percepiones', 'Error Obteniendo Informacion de Percepciones en VENTAS');
					}
				} else {
					nlapiLogExecution('ERROR', 'Calculo Percepiones', 'Error Obteniendo Informacion de Percepciones en VENTAS');
				}

			} catch (e) {
				nlapiLogExecution('ERROR', 'Calculo Percepiones', 'Error Calculando Percepiones en Ventas - NetSuite error: ' + e.message);
			}

		} else {
			// Si no Hay Articulos Para Calcular Percepciones en VENTAS
			if (isEmpty(numberOfItems) || (!isEmpty(numberOfItems) && numberOfItems == 0)) {
				nlapiLogExecution('ERROR', 'Calculo Percepiones', 'No se ingresaron Articulos en la Transaccion');
			} else {
				nlapiLogExecution('ERROR', 'Calculo Percepiones', 'Los Articulos Ingresados en la Transaccion No generan Percepciones');
			}
		}

		// Nuevo FIN - Calculo de Percepiones en Ventas
	} else {
		nlapiLogExecution('ERROR', 'Calculo Percepiones', 'No se Recibio Informacion de la Transaccion');
	}

}

function getInfoTransReferencia(transaccion_referencia){
	nlapiLogExecution('DEBUG', 'getInfoTransReferencia', 'transaccion_referencia: ' + transaccion_referencia);
	var filtroTransReferencia = new Array();
	filtroTransReferencia[0] = new nlobjSearchFilter('internalid', null, 'is', transaccion_referencia);

	var search = new nlapiLoadSearch('transaction', 'customsearch_l54_imp_transaccion_ref');
	search.addFilters(filtroTransReferencia);
	var searchResults = search.runSearch();

	var resultadoTransRef;

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
				resultadoTransRef = resultado; //Primera ve inicializa
			else
				resultadoTransRef = resultadoTransRef.concat(resultado);
		}

		// increase pointer
		resultIndex = resultIndex + resultStep;

		// once no records are returned we already got all of them
	} while (!isEmpty(resultado) && resultado.length > 0)

	nlapiLogExecution('DEBUG', 'getInfoTransReferencia', 'resultadoTransRef: ' + JSON.stringify(resultadoTransRef));
	return resultadoTransRef;
}

function calcularPercepcionesVentas(calcularPercepciones) {

	var letraDocumento = nlapiGetFieldText('custbody_l54_letra');
	//INICIO - Proceso determinar si se debe calcular percepciones al cliente
	var idclienteTransaccion = nlapiGetFieldValue('entity');

	nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas', 'idclienteTransaccion: ' + idclienteTransaccion);
	var errorCargarCliente = false;

	try {
		//var regCliente = nlapiLoadRecord('customer', idclienteTransaccion);
		var regCliente = nlapiLookupField('customer', idclienteTransaccion, 'custentity_l54_tipo_contribuyente_iibb');
		var entityType = 'customer'; 
        nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas', 'Es Cliente');
	} catch (errorCliente) {
		errorCargarCliente = true;
		nlapiLogExecution('ERROR', 'calcular_percepciones_ventas', 'Error al intentar cargar Cliente - errorCliente:' + errorCliente.message);
	}

	if (errorCargarCliente) {
		try {
			//var regCliente = nlapiLoadRecord('job', idclienteTransaccion);
			var regCliente = nlapiLookupField('job', idclienteTransaccion, 'custentity_l54_tipo_contribuyente_iibb');
			var entityType = 'job'; 
            nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas', 'Es Proyecto');
		} catch (errorJob) {
			nlapiLogExecution('ERROR', 'calcular_percepciones_ventas', 'Error al intentar cargar Proyecto - errorJob:' + errorJob.message);
		}
	}

	//var idTipoContribIIBB = regCliente.getFieldValue('custentity_l54_tipo_contribuyente_iibb');
	var idTipoContribIIBB = regCliente;
    var excepcionIVA = convertToBoolean(nlapiLookupField(entityType, idclienteTransaccion, 'custentity_l54_exencion_per_iva'));	
	var calcularPercepcionesAux = 'F';
	var fechaCaducExcepIVA = nlapiLookupField(entityType, idclienteTransaccion, 'custentity_l54_exencion_fec_cad');
	var fechaActual = nlapiGetFieldValue('trandate');
	var difPermitida = 0.05;
	var totalRestaImportes = 0.00;
	var caducoExepcion = false;

	if(!isEmpty(fechaCaducExcepIVA)){
		if(fechaActual < fechaCaducExcepIVA){
			caducoExepcion = false;
			//alert('Aun no caduca la Exepcion');
		} else if(fechaActual > fechaCaducExcepIVA){
			caducoExepcion = true;
			//alert('La Exepcion Caduco');
		} else{
			caducoExepcion = false;
			//alert('La fecha es igual');
		}
	}
	nlapiLogExecution('DEBUG','calcularPercepcionesVentas','calcularPercepciones: '+calcularPercepciones + ' - calcularPercepcionesAux: '+calcularPercepcionesAux);
	if (!isEmpty(calcularPercepciones)) {
		calcularPercepcionesAux = calcularPercepciones;
	}
	nlapiLogExecution('DEBUG','calcularPercepcionesVentas','calcularPercepciones: '+calcularPercepciones + ' - calcularPercepcionesAux: '+calcularPercepcionesAux);

	if (isEmpty(idTipoContribIIBB) && ((excepcionIVA && isEmpty(fechaCaducExcepIVA)) || (excepcionIVA && !caducoExepcion)))
	{
		nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'No se puede continuar el proceso de cálculo de percepciones porque no tiene configurado Tipo Cpntribuyente IIBB');

	}
	else
	{
		/*var regTipoContribIIBB = nlapiLoadRecord('customrecord_l54_tipo_contribuyente_iibb',idTipoContribIIBB);
		var nameTipoContribIIBB = regTipoContribIIBB.getFieldValue('name');
		var llevaPercepcion = regTipoContribIIBB.getFieldValue('custrecord_l54_calcula_percepcion');
		*/
		var llevaPercepcion = 'F';
		var nameTipoContribIIBB = '';
		if(!isEmpty(idTipoContribIIBB)){
			nameTipoContribIIBB = nlapiLookupField('customrecord_l54_tipo_contribuyente_iibb', idTipoContribIIBB, 'name');
			llevaPercepcion = nlapiLookupField('customrecord_l54_tipo_contribuyente_iibb', idTipoContribIIBB, 'custrecord_l54_calcula_percepcion');
		}
		

		if(llevaPercepcion=='F' && ((excepcionIVA && isEmpty(fechaCaducExcepIVA)) || (excepcionIVA && !caducoExepcion)))
		{
			nlapiLogExecution('DEBUG', 'Cálculo Perc. - Tipo contribuyente Cliente', 'No se calcula percepcion debido a que el Cliente Pertenece al Tipo de Contribuyente : ' + nameTipoContribIIBB);
		}//FIN - Proceso determinar si se debe calcular percepciones al cliente
		else
		{
			if(letraDocumento === "E")
			{
				nlapiLogExecution('DEBUG', 'Tipo de factura', 'Las facturas de letra E no tienen percepciones.');
			}
			else
			{
				try
				{
					//Elimino las lineas de percepciones ventas que estaban generadas en esta transacciÃ³n
					var total = parseFloat(nlapiGetFieldValue('total'),10);
					var total_aux = total;
					var totalDiscount = 0;
					nlapiLogExecution('DEBUG','calcularPercepcionesVentas','Total Transaccion: '+total);
					for (var r = 1; r <= nlapiGetLineItemCount("item"); r++)
					{
						if (nlapiGetLineItemValue('item', 'itemtype', r) == 'Discount') {
							totalDiscount += Math.abs(parseFloat(nlapiGetLineItemValue('item', 'amount', r), 10));
						}

						if ((nlapiGetLineItemValue('item', 'custcol_l54_pv_creada', r) == 'T' && calcularPercepciones=='T') || nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', r) == 'T' && calcularPercepciones=='T')
						{
							if (nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', r) != 'T')
							{
								//Se restan las percepciones al total de la factura para sacar el total sin percepciones
								total -= parseFloat(nlapiGetLineItemValue('item', 'tax1amt', r),10);
							}
							total_aux -= parseFloat(nlapiGetLineItemValue('item', 'tax1amt', r),10);
							nlapiSelectLineItem("item", r);
							nlapiRemoveLineItem("item", r);
							r--;
						}
					}

					/* INICIO - SE ELIMINAN LOS IMPORTES ACUMULADOS DEL PAGO ACTUAL */

					var cantidadAcumulados = nlapiGetLineItemCount("recmachcustrecord_l54_acum_perc_trans_asoc");
					nlapiLogExecution('DEBUG', 'calcularPercepciones', 'LINE 194 - CANTIDAD ACUMULADOS: ' + cantidadAcumulados);

					for (var j = 1; j <= nlapiGetLineItemCount("recmachcustrecord_l54_acum_perc_trans_asoc"); j++) {
						nlapiSelectLineItem("recmachcustrecord_l54_acum_perc_trans_asoc", j);
						nlapiRemoveLineItem("recmachcustrecord_l54_acum_perc_trans_asoc", j);
						j--;
					}

					/* FIN - SE ELIMINAN LOS IMPORTES ACUMULADOS DEL PAGO ACTUAL */

					var tipoCambio = parseFloat(nlapiGetFieldValue('exchangerate'),10);
					var total_moneda_local = parseFloat(parseFloat(total,10) * parseFloat(tipoCambio,10), 10);//Valor del total sin percepciones en moneda local
					//var total_moneda_local = parseFloat((total*tipoCambio), 10).toFixed(2);
					nlapiLogExecution('DEBUG','calcularPercepcionesVentas','TipoCambio Transaccion: '+tipoCambio+' - Total Transaccion (Sin Percepciones): '+total_aux+' - Total Transaccion Monena Local (Sin Percepciones): '+total_moneda_local+' - Total Transaccion Monena Local (Sin Percepciones).toFixed(2): '+(total_moneda_local).toFixed(2)+' - TipoTransaccion: '+nlapiGetRecordType()+' - calcularPercepcionesAux: '+calcularPercepcionesAux + ' - Discount: ' + totalDiscount);

					// Verificación de cálculo de percepciones para NC parciales.
					// esta validación se maneja en el script "L54 - Validar Percepciones para NC (UE).js"

					
					// Obtengo informacion de la Transaccion
					//var clienteTransaccion = nlapiGetFieldValue('entity');
					//INICIO - Variables para determinar si se debe calcular percepciones al cliente
					/*var idclienteTransaccion = nlapiGetFieldValue('entity')
					var regCliente = nlapiLoadRecord('customer',idclienteTransaccion);
					var idTipoContribIIBB = regCliente.getFieldValue('custentity_l54_tipo_contribuyente_iibb');
					var regTipoContribIIBB = nlapiLoadRecord('customrecord_l54_tipo_contribuyente_iibb',idTipoContribIIBB);
					var nameTipoContribIIBB = regTipoContribIIBB.getFieldValue('name');
					var llevaPercepcion = regTipoContribIIBB.getFieldValue('custrecord_l54_calcula_percepcion');*/
					var letra = nlapiGetFieldText('custbody_l54_letra');
					//FIN - Variables para determinar si se debe calcular percepciones al cliente
					//var total = nlapiGetFieldValue('total');
					var subTotal = nlapiGetFieldValue('subtotal');
					var discounttotal = nlapiGetFieldValue("discounttotal");
					var tipoCambio = nlapiGetFieldValue('exchangerate');
					var subsidiariaTransacicon = null;
					var esOneWorld = esOneworld();
					var costoEnvio = nlapiGetFieldValue('shippingcost');
					nlapiLogExecution('DEBUG','calcularPercepcionesVentas','LINE 2265 - calcularPercepciones: '+calcularPercepciones+' - letra: '+ letra+ ' - llevaPercepcion:  '+llevaPercepcion+' - calcularPercepcionesAux: '+calcularPercepcionesAux);
					if(isEmpty(costoEnvio))
					{
						costoEnvio=0;
					}
					var subsidiariaTransaciconText = "";
					if (esOneWorld)
					{
						subsidiariaTransacicon = nlapiGetFieldValue('subsidiary');
						subsidiariaTransaciconText = nlapiGetFieldText('subsidiary');
					}
					var tipoContribuyente = nlapiGetFieldValue('custbody_l54_tipo_contribuyente');
					// Inicio Llamar a SuiteLet para el Calculo de las Percepciones en VENTAS
					var informacionTransaccion = new Object();
					var trandate = nlapiGetFieldValue('trandate');
					var periodo = nlapiGetFieldValue('postingperiod');
					nlapiLogExecution('AUDIT', 'calcular_percepciones_ventas', 'Trandate: ' + trandate + ' / periodo: ' + periodo);
					informacionTransaccion.periodo = periodo;
					informacionTransaccion.trandate = nlapiStringToDate(trandate);
					nlapiLogExecution('AUDIT', 'calcular_percepciones_ventas', 'nlapiStringToDate Trandate: ' + informacionTransaccion.trandate);
					informacionTransaccion.cliente = idclienteTransaccion;
					informacionTransaccion.total = total_aux.toFixedOK(2);
					informacionTransaccion.subTotal = subTotal;
					informacionTransaccion.discounttotal = discounttotal;
					informacionTransaccion.tipoCambio = tipoCambio;
					informacionTransaccion.subsidiaria = subsidiariaTransacicon;
					informacionTransaccion.subsidiariaText = subsidiariaTransaciconText;
					informacionTransaccion.esOneWorld = esOneWorld;
					informacionTransaccion.costoEnvio = costoEnvio;
					informacionTransaccion.idTransaccion = nlapiGetRecordId();
                    var coeficienteBaseImponible = nlapiGetFieldValue('custbody_l54_coeficiente_base_imp');
					informacionTransaccion.coeficienteBaseImponible = (isEmpty(coeficienteBaseImponible)) ? 1.00 : coeficienteBaseImponible;
					informacionTransaccion.articulos = new Array();
					
					// INICIO Informacion Para Impuestos Internos
					informacionTransaccion.informacionImpInterno=new Object();
					informacionTransaccion.informacionImpInterno.calcularImp=false;
					informacionTransaccion.informacionImpInterno.montoImpInterno=parseFloat(0,10);
					informacionTransaccion.informacionImpInterno.baseCalculo = parseFloat(0,10);
					informacionTransaccion.informacion_articulos_iva = new Array();
					// FIN Informacion Para Impuestos Internos
					
					// INICIO NUEVO enviar informacion de si se debe calcular las percepciones o no
					informacionTransaccion.letra = letra;
					informacionTransaccion.nameTipoContribIIBB = nameTipoContribIIBB;
					informacionTransaccion.llevaPercepcion = llevaPercepcion;
					informacionTransaccion.calcularPercepciones = false;
					informacionTransaccion.calcularPercepcionesIVA = false;
					informacionTransaccion.tipoContribuyente = tipoContribuyente;
					informacionTransaccion.totalDiscount = totalDiscount;

					//Si la letra es E o llevaPercepcion es 'F' no se calculan percepciones
					// if((!isEmpty(calcularPercepciones) && calcularPercepciones=='T' && letra!='E' && llevaPercepcion =='T' && calcularPercepcionesAux == 'T') || (excepcionIVA == false || (excepcionIVA && caducoExepcion)))
					if((!isEmpty(calcularPercepciones) && calcularPercepciones=='T' && letra!='E' && llevaPercepcion =='T' && calcularPercepcionesAux == 'T'))
					{
						informacionTransaccion.calcularPercepciones = true;
					}
					// FIN NUEVO enviar informacion de si se debe calcular las percepciones o no

					if ((excepcionIVA == false || (excepcionIVA && caducoExepcion)) && calcularPercepciones == true) {
						informacionTransaccion.calcularPercepcionesIVA = true;
					}

					// Inicio Obtener Informacion de los Articulos
					var contadorArticulos = 0;
					var numberOfItems = nlapiGetLineItemCount('item');
					nlapiLogExecution('DEBUG','calcularPercepcionesVentas','LINE 2285 numberOfItems: '+numberOfItems);
					for (var i = 1; numberOfItems != null && i <= numberOfItems; i++)
					{
						var item = nlapiGetLineItemValue('item', 'item', i);
						var cantidad = nlapiGetLineItemValue('item', 'quantity', i);
						var itemImporte = nlapiGetLineItemValue('item', 'amount', i);
						var itemBienDeUso = nlapiGetLineItemValue('item', 'custcol_l54_pv_bien_de_uso', i);
						var tipoProducto = nlapiGetLineItemValue('item', 'custcol_l54_tipo_producto', i);
						var codigoImpuesto = nlapiGetLineItemValue('item', 'taxcode', i);
						var importeImpuestoIVA = nlapiGetLineItemValue('item', 'tax1amt', i);
						var importeBrutoItem = nlapiGetLineItemValue('item', 'grossamt', i);

						if(!isEmpty(itemBienDeUso) && itemBienDeUso=='T')
						{
							itemBienDeUso=true;
						}
						else
						{
							itemBienDeUso=false;
						}
						
						var tipoItem = nlapiGetLineItemValue('item', 'itemtype', i);
						
						var otrosTributos = nlapiGetLineItemValue('item', 'custcol_l54_otros_tributos', i);
						if(!isEmpty(otrosTributos) && otrosTributos=='T')
						{
							otrosTributos=true;
						}
						else
						{
							otrosTributos=false;
						}
						var impuestoInterno = nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', i);
						if(!isEmpty(impuestoInterno) && impuestoInterno=='T')
						{
							impuestoInterno=true;
						}
						else
						{
							impuestoInterno=false;
						}
						var esPercepcion = nlapiGetLineItemValue('item', 'custcol_l54_pv_creada', i);
						if(!isEmpty(esPercepcion) && esPercepcion=='T')
						{
							esPercepcion=true;
						}
						else
						{
							esPercepcion=false;
						}
						
						/*var subTotal = nlapiGetFieldValue('subtotal');
						var descuentoTotal = nlapiGetFieldValue('discounttotal');
						if(isEmpty(descuentoTotal)){
							descuentoTotal='';
						}
						
						var factorDescuento=1;

						if(descuentoTotal!=null && !isEmpty(descuentoTotal) && !isNaN(descuentoTotal) && parseFloat(descuentoTotal,10)<0){
							factorDescuento=parseFloat((parseFloat(1,10)-(parseFloat(Math.abs(descuentoTotal),10)/parseFloat(Math.abs(subTotal)))),10);
						}*/

						// Preguntar por Cantidad > 0 para no incluir Articulos de Descripcion,Subtotal,etc
						// Los Items de Descuento tenerlos en Cuenta
						if (itemBienDeUso==false && !isEmpty(itemImporte) && (tipoItem=='Discount' || (!isEmpty(cantidad) && cantidad > 0)) && otrosTributos==false && impuestoInterno==false && esPercepcion==false) {

							if (tipoItem != 'Discount' && tipoItem != 'Description' && tipoItem != 'Subtotal') {
								informacionTransaccion.articulos[contadorArticulos] = new Object();
								informacionTransaccion.articulos[contadorArticulos] = obtenerDatosLineas(item, itemImporte, importeBrutoItem, i);
							} else if (tipoItem == 'Discount') {
								informacionTransaccion.articulos[contadorArticulos - 1].importeBrutoLinea += parseFloat(importeBrutoItem, 10);
								informacionTransaccion.articulos[contadorArticulos - 1].importeNetoLinea += parseFloat(itemImporte, 10);
							}

							contadorArticulos = parseInt(contadorArticulos, 10) + parseInt(1, 10);
							
							// INICIO Enviar InformaciÃ³n Para CAclular Impuesto Interno
							if(tipoItem!='Discount')
							{
								var porcentajeImpuestoInterno=nlapiGetLineItemValue('item', 'custcol_3k_porc_imp_interno', i);
								if(!isEmpty(porcentajeImpuestoInterno) && !isNaN(parseFloat(porcentajeImpuestoInterno,10)) && parseFloat(porcentajeImpuestoInterno,10)>0)
								{
									informacionTransaccion.informacionImpInterno.calcularImp=true;
									informacionTransaccion.informacionImpInterno.baseCalculo = parseFloat(informacionTransaccion.informacionImpInterno.baseCalculo,10) + parseFloat(itemImporte,10);
									informacionTransaccion.informacionImpInterno.montoImpInterno=parseFloat(informacionTransaccion.informacionImpInterno.montoImpInterno,10) + parseFloat((parseFloat(porcentajeImpuestoInterno,10)*parseFloat(itemImporte,10)/100),10);
								}
								if(informacionTransaccion.calcularPercepcionesIVA == true){
									
									var objectIVA= new Object();
									objectIVA.tipoProducto = tipoProducto;
									objectIVA.tipoIVA = codigoImpuesto;
									objectIVA.baseNetaImponible = parseFloat(itemImporte,10);
									objectIVA.baseImporteBruto = parseFloat(importeBrutoItem,10);
									objectIVA.baseImporteIVA = parseFloat(importeImpuestoIVA,10);
									//nlapiLogExecution('DEBUG','calcular_percepciones_ventas','LINE 313 Length Array: '+ informacionTransaccion.informacion_articulos_iva + "  typeOf:" + typeof informacionTransaccion.informacion_articulos_iva);
									//nlapiLogExecution('DEBUG','calcular_percepciones_ventas','LINE 313 Is Array? : '+ informacionTransaccion.informacion_articulos_iva.isArray());
									if(informacionTransaccion.informacion_articulos_iva.length == 0){
										nlapiLogExecution('DEBUG','calcular_percepciones_ventas','Entre al if? : '+ informacionTransaccion.informacion_articulos_iva.length);
									} else{
										nlapiLogExecution('DEBUG','calcular_percepciones_ventas','Entre al else? : '+ informacionTransaccion.informacion_articulos_iva.length);
									}
									var index = -1;
									var encontrado = false;
									for (var j = 0; j < informacionTransaccion.informacion_articulos_iva.length && encontrado == false; j++) {
										//var element = array[index];
										if(informacionTransaccion.informacion_articulos_iva[j].tipoIVA == codigoImpuesto && informacionTransaccion.informacion_articulos_iva[j].tipoProducto == tipoProducto){
											index = j;
											encontrado = true;
											nlapiLogExecution('DEBUG','calcular_percepciones_ventas','Entre al if aviso');
										}
									}
									// var index = informacionTransaccion.informacion_articulos_iva.findIndex(function(obj){
									// 	return obj.tipoProducto == tipoProducto && obj.tipoIVA == codigoImpuesto;
									// });
									nlapiLogExecution('DEBUG','calcular_percepciones_ventas','Index '+ index);
									if(index>=0){
										informacionTransaccion.informacion_articulos_iva[index].baseNetaImponible = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseNetaImponible,10) + parseFloat(itemImporte,10)
										informacionTransaccion.informacion_articulos_iva[index].baseImporteBruto = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseImporteBruto,10) + parseFloat(importeBrutoItem,10)
										informacionTransaccion.informacion_articulos_iva[index].baseImporteIVA = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseImporteIVA,10) + parseFloat(importeImpuestoIVA,10)
									}else{
										informacionTransaccion.informacion_articulos_iva.push(objectIVA);
									}
								}
							}// FIN Enviar InformaciÃ³n Para CAclular Impuesto Interno
						}
					}
					// Fin Obtener Informacion de los Articulos
					//17/05/2019: SE CONDICIONA QUE EL LLAMADO AL SUITELET SEA SOLO DESDE LAS TRANSACCIONES A LAS CUALES APLICA EL CALCULO DE PERCEPCIONES
					var recTypeCalculo = nlapiGetRecordType();
					
					if (informacionTransaccion.informacionImpInterno.calcularImp==true || informacionTransaccion.calcularPercepciones == true || informacionTransaccion.calcularPercepcionesIVA == true)
					{
						informacionTransaccion.recTypeCalculo = recTypeCalculo;
						if (!isEmpty(nlapiGetRecordId()))
							informacionTransaccion.recIdCalculo = nlapiGetRecordId();

						informacionTransaccion.scriptOrigen = 'serverScript';

						if (!isEmpty(numberOfItems) && numberOfItems > 0 && !isEmpty(contadorArticulos) && contadorArticulos > 0)
						{
							var objInformacionTransaccion = new Array();

							var informacionTransaccionJson = JSON.stringify(informacionTransaccion);
							objInformacionTransaccion['informacionTransaccion'] = informacionTransaccionJson;

							if (informacionTransaccion.calcularPercepciones == true) {
									try
									{
										nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'INICIO llamada SuiteLet');
										nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'Parametros Suitelet: '+informacionTransaccionJson);
										var strURL = nlapiResolveURL('SUITELET', 'customscript_l54_cal_percepciones_ventas', 'customdeploy_l54_cal_percepciones_ventas', true);
										var objRta = nlapiRequestURL(strURL, objInformacionTransaccion, null, null);
										nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'FIN llamada SuiteLet');

										callBackPercepciones(objRta);
									}

									catch (err)
									{
										nlapiLogExecution('ERROR', 'calcularPercepcionesVentas', 'LINE 2400 - Error Calculando Percepiones en Ventas - NetSuite error: ' + err.message);
									}
							}
								
							if (informacionTransaccion.calcularPercepcionesIVA == true) {
								try
								{
									nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'INICIO llamada SuiteLetcPercepcion IVA');
									nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'Parametros Suitelet: '+informacionTransaccionJson);
									var strURLIVA = nlapiResolveURL('SUITELET', 'customscript_l54_cal_percep_ventas_iva', 'customdeploy_l54_cal_percep_ventas_iva', true);
									var objRtaIVA = nlapiRequestURL(strURLIVA, objInformacionTransaccion, null, null);
									nlapiLogExecution('DEBUG', 'calcularPercepcionesVentas', 'FIN llamada SuiteLet');

									callBackPercepcionesIVA(objRtaIVA);
								}

								catch (err)
								{
									nlapiLogExecution('ERROR', 'calcularPercepcionesVentas', 'LINE 2520 - Error Calculando Percepiones en Ventas IVA - NetSuite error: ' + err.message);
								}
							}

							// Fin Llamar a SuiteLet para el Calculo de las Percepciones en VENTAS
						}
						else
						{
							// Si no Hay Articulos Para Calcular Percepciones en VENTAS
							if (isEmpty(numberOfItems) || (!isEmpty(numberOfItems) && numberOfItems == 0))
							{
								nlapiLogExecution('DEBUG', 'Calculo Percepiones', 'No se ingresaron Articulos en la Transaccion');
							}
							else
							{
								nlapiLogExecution('DEBUG', 'Calculo Percepiones', 'Los Articulos Ingresados en la Transaccion No generan Percepciones');
							}
						}
					}
				}
				catch(e)
				{
					nlapiLogExecution('ERROR', 'Calculo Percepciones', 'LINE 2415-Error Calculando Percepiones en Ventas - NetSuite error: ' + e.message);
				}
			}
		}
	}
}

function obtenerDatosLineas(item, itemImporte, importeBrutoLinea, numberLine) {
	
	var datosLinea = {};
	datosLinea.idArticulo = item;
	datosLinea.importeBrutoLinea = parseFloat(importeBrutoLinea, 10);
	datosLinea.importeNetoLinea = parseFloat(itemImporte, 10);
	datosLinea.lineNumber = numberLine;

	/********************************* DATOS JURISDICCION UTILIZACION *****************************/
                        
	datosLinea.jurisdUtilizacion = nlapiGetLineItemValue('item', 'custcol_l54_jurisdiccion_util_ventas', numberLine); //INDICA EL ID INTERNO DE LA JURISDICCION DE UTILIZACION A NIVEL DE LÍNEA
	datosLinea.nombreJurisdUtilizacion = nlapiGetLineItemText('item', 'custcol_l54_jurisdiccion_util_ventas', numberLine); //INDICA EL NOMBRE DE LA JURISDICCION DE UTILIZACION A NIVEL DE LÍNEA
								
	/********************************* DATOS JURISDICCION UTILIZACION *****************************/
		
	/********************************* DATOS JURISDICCION ORIGEN *****************************/
		
	datosLinea.jurisdOrigen = nlapiGetLineItemValue('item', 'custcol_l54_jurisdiccion_origen_vtas', numberLine); //INDICA EL ID INTERNO DE LA JURISDICCION DE ORIGEN A NIVEL DE LÍNEA
	datosLinea.nombreJurisdOrigen = nlapiGetLineItemText('item', 'custcol_l54_jurisdiccion_origen_vtas', numberLine); //INDICA EL NOMBRE DE LA JURISDICCION DE ORIGEN A NIVEL DE LÍNEA
								
	/********************************* DATOS JURISDICCION ORIGEN *****************************/
								
	/********************************* DATOS JURISDICCION ENTREGA *****************************/
		
	datosLinea.jurisdiccionEntrega = nlapiGetLineItemValue('item', 'custcol_l54_jurisdiccion_desti_ventas', numberLine); //INDICA EL ID INTERNO DE LA JURISDICCION DE DESTINO A NIVEL DE LÍNEA
	datosLinea.jurisdiccionEntregaNombre = nlapiGetLineItemText('item', 'custcol_l54_jurisdiccion_desti_ventas', numberLine); //INDICA EL NOMBRE DE LA JURISDICCION DE DESTINO A NIVEL DE LÍNEA
		
	/********************************* DATOS JURISDICCION s *****************************/
		
	/********************************* DATOS JURISDICCION FACTURACION *****************************/
		
	datosLinea.jurisdFacturacion = nlapiGetLineItemValue('item', 'custcol_l54_jurisdiccion_fact_ventas', numberLine);
	datosLinea.nombreJurisdFacturacion = nlapiGetLineItemText('item', 'custcol_l54_jurisdiccion_fact_ventas', numberLine);

	/********************************* DATOS JURISDICCION FACTURACION *****************************/

	/********************************* DATOS JURISDICCION EMPRESA *****************************/
		
	datosLinea.jurisdEmpresa = nlapiGetLineItemValue('item', 'custcol_l54_jurisdiccion_empresa_vtas', numberLine);
	datosLinea.nombreJurisdEmpresa = nlapiGetLineItemText('item', 'custcol_l54_jurisdiccion_empresa_vtas', numberLine);

	/********************************* DATOS JURISDICCION EMPRESA *****************************/

	return datosLinea;
}

function callBackPercepciones(response) {
	try {
		if (!isEmpty(response))
		{
			var informacionPercepciones = JSON.parse(response.getBody());
			var param_codigo_IVA = informacionPercepciones.codigo_IVA;
			if (!isEmpty(informacionPercepciones))
			{
				if (informacionPercepciones.error == false)
				{
					// Inicio Grabar Informacion de las Percepciones en la Transaccion
					if (informacionPercepciones.infoPercepciones != null && informacionPercepciones.infoPercepciones.length > 0)
					{
						var fecha = nlapiGetFieldValue('trandate');
						// elimino las lineas de percepciones ventas que estaban generadas en esta transacciÃ³n
						var numberOfItems = nlapiGetLineItemCount('item');

						for (var r = 1; r <= nlapiGetLineItemCount("item"); r++)
						{
							if (nlapiGetLineItemValue('item', 'custcol_l54_pv_creada', r) == 'T' && nlapiGetLineItemValue('item', 'custcol_l54_tipo_percepcion_vtas', r) != param_codigo_IVA)
							{
								nlapiSelectLineItem("item", r);
								nlapiRemoveLineItem("item", r);
								r--;
							}
						}

						for (var i = 0; i < informacionPercepciones.infoPercepciones.length; i++)
						{
							//FDS1 chequueo la alicuota de percepciÃ³n.
							var porcentajeAlicuota = Math.abs(parseFloat(informacionPercepciones.infoPercepciones[i].porcentaje, 10));

							if (porcentajeAlicuota > 0 || porcentajeAlicuota > 0.00)
							{ //FDS1: Solo inserto si es distinto de 0 la alicuota de percepciÃ³n

								nlapiSelectNewLineItem('item');
								nlapiSetCurrentLineItemValue('item', 'item', informacionPercepciones.infoPercepciones[i].item, true, true);
								nlapiSetCurrentLineItemValue('item', 'description', informacionPercepciones.infoPercepciones[i].descripcion);
								nlapiSetCurrentLineItemValue('item', 'quantity', informacionPercepciones.infoPercepciones[i].cantidad, true);
								nlapiSetCurrentLineItemValue('item', 'rate', informacionPercepciones.infoPercepciones[i].importeUnitario, true);
								nlapiSetCurrentLineItemValue('item', 'amount', informacionPercepciones.infoPercepciones[i].importeTotal, true);
								nlapiSetCurrentLineItemValue('item', 'taxcode', informacionPercepciones.infoPercepciones[i].codigoImpuesto, true, true);
								// Nuevo - Grabar Procentaje de Impuesto
								nlapiSetCurrentLineItemValue('item', 'taxrate1', informacionPercepciones.infoPercepciones[i].porcentaje, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_jurisd_iibb_lineas', informacionPercepciones.infoPercepciones[i].jurisdiccion, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_pv_creada', informacionPercepciones.infoPercepciones[i].procesoPV);
								// Imp. Perc. redondeado a dos decimales
								nlapiSetCurrentLineItemValue('item', 'tax1amt', informacionPercepciones.infoPercepciones[i].importeImpuesto, true);
								// Imp. Perc. Original
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_percepcion_original', informacionPercepciones.infoPercepciones[i].importeImpuestoOriginal, true);
								// Diferencia por redondeo de Imp. Percepción
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_diferencia_redondeo', informacionPercepciones.infoPercepciones[i].diferenciaRedondeo, true);
								// Base de cálculo redondeada
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_monto_imp_perc', informacionPercepciones.infoPercepciones[i].montoImponible, true);
								// Base de cálculo original
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_calculo_original', informacionPercepciones.infoPercepciones[i].montoImponibleOriginal, true);
								// Nuevo - Grabar Importe Impuesto original, coeficiente base imponible y monto sujeto percepción en moneda local
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_coeficiente_base_imp', informacionPercepciones.infoPercepciones[i].coeficienteBaseImponible, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_imponible_original', informacionPercepciones.infoPercepciones[i].montoImponiblePercOriginal, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_monto_suj_perc_moneda_loc', informacionPercepciones.infoPercepciones[i].montoImponiblePercMonedaLocal, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_perc_moneda_loc', informacionPercepciones.infoPercepciones[i].importePercMonedaLocal, true);
								// Nuevo - Grabar Norma IIBB
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_norma_iibb_perc', informacionPercepciones.infoPercepciones[i].normaIIBB, true, true);
								// Nuevo - Grabar Tipo Contribuyente IIBB
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_tipo_contribuyente', informacionPercepciones.infoPercepciones[i].tipoContribuyenteIIBB, true, true);
								// Nuevo - Grabar Campo Alicuota
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_alicuota', informacionPercepciones.infoPercepciones[i].porcentaje, true, true);
								//alert("Alicuota : " + informacionPercepciones.infoPercepciones[i].porcentaje + " Norma IIBB : " + informacionPercepciones.infoPercepciones[i].normaIIBB);
								// NUEVO
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_porcentaje_desc_gral', 0, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_desc_gral', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_neto_sin_desc', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_impint_sin_desc', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_impuesto_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_net_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_total_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);
								// Si es una Orden de Venta cerrar la linea
								if(nlapiGetRecordType()=='salesorder')
								{
									nlapiSetCurrentLineItemValue('item', 'isclosed', 'T', true, true);
								}
								nlapiCommitLineItem('item');
							}
						}

						nlapiLogExecution('DEBUG', 'calcularPercepciones', 'informacionPercepciones.detalleAcumulados: ' + JSON.stringify(informacionPercepciones.detalleAcumulados));

						//INICIO - REGISTRO DE ACUMULADOS RETENCION IIBB
						if (!isEmpty(informacionPercepciones.detalleAcumulados) && informacionPercepciones.detalleAcumulados.length > 0) {
							for (var i = 0; i < informacionPercepciones.detalleAcumulados.length; i++) {
								nlapiLogExecution('DEBUG', 'calcularPercepciones', 'linea i: ' + i + ' / detalleAcumulados : ' + JSON.stringify(informacionPercepciones.detalleAcumulados[i]));

								nlapiSelectNewLineItem('recmachcustrecord_l54_acum_perc_trans_asoc');
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_cliente', informacionPercepciones.detalleAcumulados[i].cliente);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_periodo', informacionPercepciones.detalleAcumulados[i].periodo);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_subsidiaria', informacionPercepciones.detalleAcumulados[i].subsidiaria);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_base_calculo', informacionPercepciones.detalleAcumulados[i].baseCalculo);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_jurisdiccion', informacionPercepciones.detalleAcumulados[i].jurisdiccion);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_per_tipo_cambio', informacionPercepciones.detalleAcumulados[i].tipoCambio);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_fecha', fecha);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_anulado', false);
								nlapiCommitLineItem('recmachcustrecord_l54_acum_perc_trans_asoc');
							}
						}
						//FIN - REGISTRO DE ACUMULADOS RETENCION IIBB

					}
					// Fin Grabar Informacion de las Percepciones en la Transaccion
					// Informo Warnings
					var mensajeWarning = 'Aviso : \n ';
					if (informacionPercepciones.warning == true)
					{
						for (var i = 0; informacionPercepciones.mensajeWarning != null && i < informacionPercepciones.mensajeWarning.length; i++)
						{
							mensajeWarning += ((i + 1) + ' - ' + informacionPercepciones.mensajeWarning[i] + '\n');
						}
						nlapiLogExecution('DEBUG', 'Calculo Percepiones', 'Warning Calculo Percepiones en Ventas : ' + mensajeWarning);
					}
					// Muestro el Mensaje de Finalizacion
					nlapiLogExecution('DEBUG', 'Calculo Percepiones', 'Se Calcularon las Percepiones en Ventas Correctamente - Mensaje : ' + informacionPercepciones.mensajeOk);
				}
				else
				{
					// Muestro el Error
					var erroresCalculoPercepciones = "";
					if (informacionPercepciones.mensajeError != null && informacionPercepciones.mensajeError.length == 1)
					{
						erroresCalculoPercepciones = informacionPercepciones.mensajeError[0];
					}
					else
					{
						for (var i = 0; informacionPercepciones.mensajeError != null && i < informacionPercepciones.mensajeError.length; i++)
						{
							erroresCalculoPercepciones += informacionPercepciones.mensajeError[i] + '\n';
						}
					}
					nlapiLogExecution('ERROR', 'Calculo Percepiones', 'Error Calculando PV - Error : ' + erroresCalculoPercepciones);
				}
				if (informacionPercepciones.errorImpInt == false)
				{
					// Inicio Grabar Informacion del Impuesto Interno en la Transaccion
					if (informacionPercepciones.infoImpuestoInterno != null && informacionPercepciones.infoImpuestoInterno.length > 0)
					{
						// elimino las lineas de Impuesto Interno que estaban generadas en esta transacciÃ³n
						var numberOfItems = nlapiGetLineItemCount('item');

						for (var r = 1; r <= nlapiGetLineItemCount("item"); r++)
						{
							if (nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', r) == 'T')
							{
								nlapiSelectLineItem("item", r);
								nlapiRemoveLineItem("item", r);
								r--;
							}
						}

						for (var i = 0; i < informacionPercepciones.infoImpuestoInterno.length; i++)
						{
							nlapiSelectNewLineItem('item');
							nlapiSetCurrentLineItemValue('item', 'item', informacionPercepciones.infoImpuestoInterno[i].item, true, true);
							//nlapiSetCurrentLineItemValue('item', 'description', informacionPercepciones.infoImpuestoInterno[i].descripcion);
							nlapiSetCurrentLineItemValue('item', 'quantity', informacionPercepciones.infoImpuestoInterno[i].cantidad, true);
							nlapiSetCurrentLineItemValue('item', 'rate', informacionPercepciones.infoImpuestoInterno[i].importeUnitario, true);
							nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_calculo', informacionPercepciones.infoImpuestoInterno[i].baseCalculo, true);
							nlapiSetCurrentLineItemValue('item', 'amount', informacionPercepciones.infoImpuestoInterno[i].importeTotal, true);
							nlapiSetCurrentLineItemValue('item', 'taxcode', informacionPercepciones.infoImpuestoInterno[i].codigoImpuesto, true, true);
							nlapiSetCurrentLineItemValue('item', 'taxrate1', informacionPercepciones.infoImpuestoInterno[i].porcCodigoImpuesto, true, true);
							nlapiSetCurrentLineItemValue('item', 'custcol_l54_impuesto_interno', informacionPercepciones.infoImpuestoInterno[i].impuestoInterno);
							nlapiSetCurrentLineItemValue('item', 'tax1amt', informacionPercepciones.infoImpuestoInterno[i].importeImpuesto, true);
							nlapiSetCurrentLineItemValue('item', 'custcol_l54_porcentaje_desc_gral', 0, true, true);
							nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_desc_gral', 0.00, true, true);
							nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_neto_sin_desc', 0.00, true, true);
							nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_impuesto_sin_desc', informacionPercepciones.infoImpuestoInterno[i].importeImpuesto, true, true);
							nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_net_sin_desc', informacionPercepciones.infoImpuestoInterno[i].importeImpuesto, true, true);
							nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_total_sin_desc', informacionPercepciones.infoImpuestoInterno[i].importeImpuesto, true, true);
							// Si es una Orden de Venta cerrar la linea
							if(nlapiGetRecordType()=='salesorder')
							{
								nlapiSetCurrentLineItemValue('item', 'isclosed', 'T', true, true);
							}
							nlapiCommitLineItem('item');
						}
					}
					// Fin Grabar Informacion del Impuesto Interno en la Transaccion
					// Informo Warnings
					var mensajeWarning = 'Aviso : \n ';
					if (informacionPercepciones.warningImpInt == true)
					{
						for (var i = 0; informacionPercepciones.mensajeWarningImpInt != null && i < informacionPercepciones.mensajeWarningImpInt.length; i++)
						{
							mensajeWarningImpInt += ((i + 1) + ' - ' + informacionPercepciones.mensajeWarningImpInt[i] + '\n');
						}
						nlapiLogExecution('DEBUG', 'Calculo Impuestos Internos', 'Warning Calculo Impuestos Internos en Ventas : ' + mensajeWarningImpInt);
					}

					// Muestro el Mensaje de Finalizacion
					nlapiLogExecution('DEBUG', 'Calculo Impuestos Internos', 'Se Calcularon los Impuestos Internos en Ventas Correctamente - Mensaje : ' + informacionPercepciones.mensajeOkImpInt);
				}
				else
				{
					// Muestro el Error
					var erroresCalculoImpInterno = "";
					if (informacionPercepciones.mensajeErrorImpInt != null && informacionPercepciones.mensajeErrorImpInt.length == 1)
					{
						erroresCalculoImpInterno = informacionPercepciones.mensajeErrorImpInt[0];
					}
					else 
					{
						for (var i = 0; informacionPercepciones.mensajeErrorImpInt != null && i < informacionPercepciones.mensajeErrorImpInt.length; i++)
						{
							erroresCalculoImpInterno += informacionPercepciones.mensajeErrorImpInt[i] + '\n';
						}
					}
					//alert(erroresCalculoImpInterno);
					nlapiLogExecution('ERROR', 'Calculo Impuestos Internos', 'Error Calculando Impuestos Internos - Error : ' + erroresCalculoImpInterno);
				}
			}
			else
			{
				nlapiLogExecution('ERROR', 'Calculo Percepiones', 'Error Obteniendo Informacion de Percepciones en VENTAS');
			}
		}
		else
		{
			nlapiLogExecution('ERROR', 'Calculo Percepiones', 'Error Obteniendo Informacion de Percepciones en VENTAS');
		}

		if(nlapiGetRecordType() == 'creditmemo'){
			validPercepciones()
		}
	}
	catch (err)
	{
		nlapiLogExecution('ERROR', 'Calculo Percepiones', 'Error Calculando Percepiones en Ventas CallBack - NetSuite error: ' + err.message);
	}
}
function callBackPercepcionesIVA(response) {
	try {
		if (!isEmpty(response)) {
			var informacionPercepciones = JSON.parse(response.getBody());
			
			var param_codigo_IVA = informacionPercepciones.codigo_IVA;
			if (!isEmpty(informacionPercepciones)) {
				var mensajeFinalAlert="";
				if (informacionPercepciones.error == false) {
					// Inicio Grabar Informacion de las Percepciones en la Transaccion
					if (informacionPercepciones.infoPercepciones != null && informacionPercepciones.infoPercepciones.length > 0) {
						// elimino las líneas de percepciones ventas que estaban generadas en esta transacción
						var numberOfItems = nlapiGetLineItemCount('item');

						for (var r = 1; r <= nlapiGetLineItemCount("item"); r++) {
							if (nlapiGetLineItemValue('item', 'custcol_l54_pv_creada', r) == 'T' && nlapiGetLineItemValue('item', 'custcol_l54_tipo_percepcion_vtas', r) == param_codigo_IVA) {
								nlapiSelectLineItem("item", r);
								nlapiRemoveLineItem("item");
								r--;
							}
						}

						for (var i = 0; i < informacionPercepciones.infoPercepciones.length; i++) {

							//FDS1 chequueo la alicuota de percepción.
							var porcentajeAlicuota = Math.abs(parseFloat(informacionPercepciones.infoPercepciones[i].porcentaje, 10));

							if (porcentajeAlicuota > 0 || porcentajeAlicuota > 0.00) { //FDS1: Solo inserto si es distinto de 0 la alicuota de percepción

								nlapiSelectNewLineItem('item');
								nlapiSetCurrentLineItemValue('item', 'item', informacionPercepciones.infoPercepciones[i].item, true, true);
								nlapiSetCurrentLineItemValue('item', 'description', informacionPercepciones.infoPercepciones[i].descripcion);
								nlapiSetCurrentLineItemValue('item', 'quantity', informacionPercepciones.infoPercepciones[i].cantidad, true);
								nlapiSetCurrentLineItemValue('item', 'rate', informacionPercepciones.infoPercepciones[i].importeUnitario, true);
								nlapiSetCurrentLineItemValue('item', 'amount', informacionPercepciones.infoPercepciones[i].importeTotal, true);
								nlapiSetCurrentLineItemValue('item', 'taxcode', informacionPercepciones.infoPercepciones[i].codigoImpuesto, true, true);
								// Nuevo - Grabar Porcentaje de Impuesto y detalles de los importes
								nlapiSetCurrentLineItemValue('item', 'taxrate1', informacionPercepciones.infoPercepciones[i].porcentaje, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_jurisd_iibb_lineas', informacionPercepciones.infoPercepciones[i].jurisdiccion, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_pv_creada', informacionPercepciones.infoPercepciones[i].procesoPV);
								// Imp. Perc. redondeado a dos decimales
								nlapiSetCurrentLineItemValue('item', 'tax1amt', informacionPercepciones.infoPercepciones[i].importeImpuesto, true);
								// Imp. Perc. Original
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_percepcion_original', informacionPercepciones.infoPercepciones[i].importeImpuestoOriginal, true);
								// Diferencia por redondeo de Imp. Percepción
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_diferencia_redondeo', informacionPercepciones.infoPercepciones[i].diferenciaRedondeo, true);
								// Base de cálculo redondeada
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_monto_imp_perc', informacionPercepciones.infoPercepciones[i].montoImponible, true);
								// Base de cálculo original
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_calculo_original', informacionPercepciones.infoPercepciones[i].montoImponibleOriginal, true);
								// Nuevo - Grabar Importe Impuesto original, coeficiente base imponible y monto sujeto percepción en moneda local
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_coeficiente_base_imp', informacionPercepciones.infoPercepciones[i].coeficienteBaseImponible, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_imponible_original', informacionPercepciones.infoPercepciones[i].montoImponiblePercOriginal, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_monto_suj_perc_moneda_loc', informacionPercepciones.infoPercepciones[i].montoImponiblePercMonedaLocal, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_perc_moneda_loc', informacionPercepciones.infoPercepciones[i].importePercMonedaLocal, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_cod_imp_sicore', informacionPercepciones.infoPercepciones[i].codigoImpuesoSicore, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_cod_reg_sicore', informacionPercepciones.infoPercepciones[i].codigoRegimenSicore, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_cod_cond_sicore', informacionPercepciones.infoPercepciones[i].codigoCondicionSicore, true, true);
								// Nuevo - Grabar Norma IIBB
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_norma_iibb_perc', informacionPercepciones.infoPercepciones[i].normaIIBB, true, true);
								// Nuevo - Grabar Tipo Contribuyente IIBB
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_tipo_contribuyente', informacionPercepciones.infoPercepciones[i].tipoContribuyenteIIBB, true, true);
								// Nuevo - Grabar Campo Alicuota
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_alicuota', informacionPercepciones.infoPercepciones[i].porcentaje, true, true);
								//alert("Alicuota : " + informacionPercepciones.infoPercepciones[i].porcentaje + " Norma IIBB : " + informacionPercepciones.infoPercepciones[i].normaIIBB);
								// NUEVO
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_porcentaje_desc_gral', 0, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_desc_gral', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_neto_sin_desc', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_impint_sin_desc', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_impuesto_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_net_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_total_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_tipo_percepcion_vtas', param_codigo_IVA , true, true);
								// Si es una Orden de Venta cerrar la linea
								if(nlapiGetRecordType()=='salesorder'){
									nlapiSetCurrentLineItemValue('item', 'isclosed', 'T', true, true);
								}
								nlapiCommitLineItem('item');
							}
						}

					}
					// Fin Grabar Informacion de las Percepciones en la Transaccion
					// Informo Warnings
					var mensajeWarning = 'Aviso : \n ';
					if (informacionPercepciones.warning == true) {
						for (var i = 0; informacionPercepciones.mensajeWarning != null && i < informacionPercepciones.mensajeWarning.length; i++) {
							mensajeWarning += ((i + 1) + ' - ' + informacionPercepciones.mensajeWarning[i] + '\n');
						}
						//alert(mensajeWarning);
						mensajeFinalAlert+=mensajeWarning;
					}

					// Muestro el Mensaje de Finalizacion
					//alert(informacionPercepciones.mensajeOk);
					mensajeFinalAlert+=informacionPercepciones.mensajeOk + '\n';
				} else {
					// Muestro el Error
					var erroresCalculoPercepciones = "";
					if (informacionPercepciones.mensajeError != null && informacionPercepciones.mensajeError.length == 1) {
						erroresCalculoPercepciones = informacionPercepciones.mensajeError[0];
					} else {
						for (var i = 0; informacionPercepciones.mensajeError != null && i < informacionPercepciones.mensajeError.length; i++) {
							erroresCalculoPercepciones += informacionPercepciones.mensajeError[i] + '\n';
						}
					}
					//alert(erroresCalculoPercepciones);
					mensajeFinalAlert+=erroresCalculoPercepciones;
				}
				if (informacionPercepciones.errorImpInt == false) {
					// Inicio Grabar Informacion del Impuesto Interno en la Transaccion
					if (informacionPercepciones.infoImpuestoInterno != null && informacionPercepciones.infoImpuestoInterno.length > 0) {
						// elimino las líneas de Impuesto Interno que estaban generadas en esta transacción
						var numberOfItems = nlapiGetLineItemCount('item');

						for (var r = 1; r <= nlapiGetLineItemCount("item"); r++) {
							if (nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', r) == 'T') {
								nlapiSelectLineItem("item", r);
								nlapiRemoveLineItem("item");
								r--;
							}
						}

						for (var i = 0; i < informacionPercepciones.infoImpuestoInterno.length; i++) {

								nlapiSelectNewLineItem('item');
								nlapiSetCurrentLineItemValue('item', 'item', informacionPercepciones.infoImpuestoInterno[i].item, true, true);
								//nlapiSetCurrentLineItemValue('item', 'description', informacionPercepciones.infoImpuestoInterno[i].descripcion);
								nlapiSetCurrentLineItemValue('item', 'quantity', informacionPercepciones.infoImpuestoInterno[i].cantidad, true);
								nlapiSetCurrentLineItemValue('item', 'rate', informacionPercepciones.infoImpuestoInterno[i].importeUnitario, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_calculo', informacionPercepciones.infoImpuestoInterno[i].baseCalculo, true);
								nlapiSetCurrentLineItemValue('item', 'amount', informacionPercepciones.infoImpuestoInterno[i].importeTotal, true);
								nlapiSetCurrentLineItemValue('item', 'taxcode', informacionPercepciones.infoImpuestoInterno[i].codigoImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'taxrate1', informacionPercepciones.infoImpuestoInterno[i].porcCodigoImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_impuesto_interno', informacionPercepciones.infoImpuestoInterno[i].impuestoInterno);
								nlapiSetCurrentLineItemValue('item', 'tax1amt', informacionPercepciones.infoImpuestoInterno[i].importeImpuesto, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_porcentaje_desc_gral', 0, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_desc_gral', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_neto_sin_desc', 0.00, true, true);
								// Si es una Orden de Venta cerrar la linea
								if(nlapiGetRecordType()=='salesorder'){
									nlapiSetCurrentLineItemValue('item', 'isclosed', 'T', true, true);
								}
								nlapiCommitLineItem('item');
							
						}

					}
					// Fin Grabar Informacion del Impuesto Interno en la Transaccion
					// Informo Warnings
					var mensajeWarning = 'Aviso : \n ';
					if (informacionPercepciones.warningImpInt == true) {
						for (var i = 0; informacionPercepciones.mensajeWarningImpInt != null && i < informacionPercepciones.mensajeWarningImpInt.length; i++) {
							mensajeWarningImpInt += ((i + 1) + ' - ' + informacionPercepciones.mensajeWarningImpInt[i] + '\n');
						}
						//alert(mensajeWarningImpInt);
						mensajeFinalAlert+=mensajeWarningImpInt;
					}

					// Muestro el Mensaje de Finalizacion
					//alert(informacionPercepciones.mensajeOkImpInt);
					mensajeFinalAlert+=informacionPercepciones.mensajeOkImpInt + '\n';
				} else {
					// Muestro el Error
					var erroresCalculoImpInterno = "";
					if (informacionPercepciones.mensajeErrorImpInt != null && informacionPercepciones.mensajeErrorImpInt.length == 1) {
						erroresCalculoImpInterno = informacionPercepciones.mensajeErrorImpInt[0];
					} else {
						for (var i = 0; informacionPercepciones.mensajeErrorImpInt != null && i < informacionPercepciones.mensajeErrorImpInt.length; i++) {
							erroresCalculoImpInterno += informacionPercepciones.mensajeErrorImpInt[i] + '\n';
						}
					}
					//alert(erroresCalculoImpInterno);
					mensajeFinalAlert+=erroresCalculoImpInterno;
				}
				// Informar Mensaje General
				alert(mensajeFinalAlert);
			} else {
				alert("Error Obteniendo Informacion de Percepciones en VENTAS");
			}
		} else {
			alert("Error Obteniendo Informacion de Percepciones en VENTAS");
		}
		if(nlapiGetRecordType() == 'creditmemo'){
			validPercepciones()
		}
	} catch (err) {
		alert("Error Calulando Percepcion en VENTAS , Error : " + err.message);
	}
}
function l54beforeSubmitTransaction(type) {

	try
	{
		var context = nlapiGetContext();

        if (type == 'create')
        {
            nlapiLogExecution('DEBUG', 'BEFORE SUBMIT TRANSACTION CREATE', 'INICIO BEFORE SUBMIT TRANSACTION CREATE');
            // INICIO CALCULAR DESCUENTO GENERAL
            nlapiLogExecution('DEBUG', 'Calculo Descuento General', 'INICIO Calculo Descuento General');
            recalcularDescuentoGeneralCompleto();
            nlapiLogExecution('DEBUG', 'Calculo Descuento General', 'FIN Calculo Descuento General');
            // FIN CALCULAR DESCUENTO GENERAL
                
            // NUEVO Calcular Impuesto Internos Siempre
            var calcularPercepciones = nlapiGetFieldValue('custbody_l54_calc_perc_aut');
            //if (!isEmpty(calcularPercepciones) && calcularPercepciones == 'T') {
                nlapiLogExecution('DEBUG', 'Calculo Percepiones', 'INICIO Calculo Percepciones en Ventas e Impuestos Internos - Calcular Percepciones : ' + calcularPercepciones);
				nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2805 - CalculoPercepciones - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());
                try
                {
                    calcularPercepcionesVentas(calcularPercepciones);
                } catch (err) {
                    nlapiLogExecution('ERROR', 'Calculo Percepiones', 'Error Calculo Percepciones en Ventas e Impuestos Internos (Create) - NetSuite error: ' + err.message);
                }
				nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2812 - CalculoPercepciones - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());
                nlapiLogExecution('DEBUG', 'Calculo Percepiones', 'FIN Calculo Percepciones en Ventas e Impuestos Internos');
            //}

            /*FDS2** Busco la subsidiaria */
            if (esOneworld())
                var subsidiaria = nlapiGetFieldValue('subsidiary');
            else
                var subsidiaria = null;
            /*FDS2***/

            var total = nlapiGetFieldValue('total');
            var numeroEnLetras = getNumeroEnLetras(total, subsidiaria);

            if (!isEmpty(numeroEnLetras))
                nlapiSetFieldValue("custbody_l54_monto_escrito", numeroEnLetras);

            nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'INICIO actualizarLineasPorIvaBeforeSubmit');
			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2830 - actualizarLineasPorIvaBeforeSubmit - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());
            actualizarLineasPorIvaBeforeSubmit(subsidiaria);
			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2832 - actualizarLineasPorIvaBeforeSubmit - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());
            nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'FIN actualizarLineasPorIvaBeforeSubmit');

            // si se utiliza numerador automatico
            // No se Genera mas Numerador para Factura,Nota de Debito, Nota de Credito, porque lo genera el proceso de Factura Electronica
            //if (nlapiGetFieldValue('custbody_l54_numerador_manual') == 'F' && isEmpty(nlapiGetFieldValue('custbody_l54_numero_localizado'))) {
			if (nlapiGetFieldValue('custbody_l54_numerador_manual') == 'F') {

                var esND = nlapiGetFieldValue('custbody_l54_nd');
                var tipoTransStr = nlapiGetRecordType();
                var bocaId = nlapiGetFieldValue("custbody_l54_boca");
                var letraId = nlapiGetFieldValue("custbody_l54_letra");
                var esLiquidoProducto = nlapiGetFieldValue("custbody_l54_liquido_producto");
                var esCreditoElectronico = nlapiGetFieldValue("custbody_l54_es_credito_electronico");
                if (isEmpty(esLiquidoProducto)) {
                    esLiquidoProducto = 'F';
                }
                if (isEmpty(esCreditoElectronico)) {
                    esCreditoElectronico = 'F';
                }
                nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LiquidoProducto: ' + esLiquidoProducto+' - CreditoElectronico: '+esCreditoElectronico);

                var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
                var numeradorArray = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico);

				nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2736 - numerador: ' + numeradorArray['numerador'] + ' - numerador prefijo: ' + numeradorArray['numeradorPrefijo'] + ' - numeradorElectronico: ' + numeradorArray['numeradorElectronico']); 

                nlapiSetFieldValue("custbody_l54_numero", numeradorArray['numerador']);
                nlapiSetFieldValue("custbody_l54_numero_localizado", numeradorArray['numeradorPrefijo']);
                nlapiSetFieldValue("custbody_l54_numerador_electronico", numeradorArray['numeradorElectronico']);
                // Nuevo Almacenar el Tipo de Transaccion AFIP
                /*if(!isEmpty(numeradorArray['tipoTransAFIP']))
                record.setFieldValue("custbody_l54_tipo_trans_afip", numeradorArray['tipoTransAFIP']);*/

                if (!isEmpty(numeradorArray['referencia']))
                    nlapiSetFieldValue("custbody_l54_ref_numerador", numeradorArray['referencia']);

                // Nuevo Configurar el Codigo de Moneda AFIP
                var monedaId = nlapiGetFieldValue('currency');
                if (!isEmpty(monedaId)) {
                    var monedaAFIPId = obtenerIDMoneda(monedaId);
                    if (!isEmpty(monedaAFIPId)) {
                        nlapiSetFieldValue("custbody_l54_tipo_moneda", monedaAFIPId);
                    }
                }
            } else {
                var esND = nlapiGetFieldValue('custbody_l54_nd');
                var tipoTransStr = nlapiGetRecordType();
                var bocaId = nlapiGetFieldValue("custbody_l54_boca");
                var letraId = nlapiGetFieldValue("custbody_l54_letra");
                var esLiquidoProducto = nlapiGetFieldValue("custbody_l54_liquido_producto");
                var esCreditoElectronico = nlapiGetFieldValue("custbody_l54_es_credito_electronico");
                if (isEmpty(esLiquidoProducto)) {
                    esLiquidoProducto = 'F';
                }
                if (isEmpty(esCreditoElectronico)) {
                    esCreditoElectronico = 'F';
                }
                nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'esLiquidoProducto: ' + esLiquidoProducto+' - esCreditoElectronico: '+esCreditoElectronico);

                var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
                var numeradorArray = consultarNumerador(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto,esCreditoElectronico);

                // Nuevo Almacenar el Tipo de Transaccion AFIP
                /*if(!isEmpty(numeradorArray['tipoTransAFIP']))
                record.setFieldValue("custbody_l54_tipo_trans_afip", numeradorArray['tipoTransAFIP']);*/

                if (!isEmpty(numeradorArray['referencia']))
                    nlapiSetFieldValue("custbody_l54_ref_numerador", numeradorArray['referencia']);

                // Nuevo Configurar el Codigo de Moneda AFIP
                var monedaId = nlapiGetFieldValue('currency');
                if (!isEmpty(monedaId)) {
                    var monedaAFIPId = obtenerIDMoneda(monedaId);
                    if (!isEmpty(monedaAFIPId)) {
                        nlapiSetFieldValue("custbody_l54_tipo_moneda", monedaAFIPId);
                    }
                }
            }

			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2912 - LOG DE CONTROL - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());

            //Se desmarca el check de la factura aplicada si es el caso
            var idTransApply = [];
            if (nlapiGetRecordType() == 'creditmemo') {
                for (var j = 1; j <= nlapiGetLineItemCount("apply"); j++) {
                    if (nlapiGetLineItemValue('apply', 'apply', j) == 'T') {
                        idTransApply.push({
                            internalId: nlapiGetLineItemValue('apply', 'internalid', j),
                            line: j
                        });
                        nlapiSetLineItemValue('apply', 'apply', j, 'F');
                    }
                }
                    
                nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE-2749. Array: ' + JSON.stringify(idTransApply));
                if (!isEmpty(idTransApply) && idTransApply.length > 0) {
                    for (var j = 0; j < idTransApply.length; j++) {
                        nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE-2752. INVOICE DATA APPLIED (T): ' + idTransApply[j].internalId);
                        nlapiSetLineItemValue('apply', 'apply', idTransApply[j].line, 'T');
                    }
                }
            }

            nlapiSetFieldValue("custbody_l54_reg_inf_trans_act", 'T');

            nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'INICIO verificarTipoItem - type: '+type);
			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2939 - verificarTipoItem - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());
            // Generacion de Concepto de la Transaccion
            verificarTipoItem(type);
			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2942 - verificarTipoItem - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());
            nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'FIN verificarTipoItem');
            nlapiLogExecution('DEBUG', 'BEFORE SUBMIT TRANSACTION CREATE', 'FIN BEFORE SUBMIT TRANSACTION CREATE');
        }

        if (type == 'edit') {

            nlapiLogExecution('DEBUG', 'BEFORE SUBMIT TRANSACTION EDIT', 'INICIO BEFORE SUBMIT TRANSACTION EDIT');
            // INICIO CALCULAR DESCUENTO GENERAL
            nlapiLogExecution('DEBUG', 'Calculo Descuento General', 'INICIO Calculo Descuento General');
            recalcularDescuentoGeneralCompleto();
            nlapiLogExecution('DEBUG', 'Calculo Descuento General', 'FIN Calculo Descuento General');
            // FIN CALCULAR DESCUENTO GENERAL
                
            // NUEVO Calcular Impuesto Internos Siempre
            var calcularPercepciones = nlapiGetFieldValue('custbody_l54_calc_perc_aut');
            //if (!isEmpty(calcularPercepciones) && calcularPercepciones == 'T') {
                nlapiLogExecution('DEBUG', 'Calculo Percepciones', 'INICIO Calculo Percepciones en Ventas e Impuestos Internos - Calcular Percepciones : ' + calcularPercepciones);
				nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2960 - calcularPercepcionesVentas - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());
                try {
                    calcularPercepcionesVentas(calcularPercepciones);
                } catch (err) {
                    nlapiLogExecution('ERROR', 'Calculo Percepciones', 'Error Calculo Percepciones en Ventas e Impuestos Internos (Edit) - NetSuite error: ' + err.message);
                }
				nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2966 - calcularPercepcionesVentas - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());
                nlapiLogExecution('DEBUG', 'Calculo Percepciones', 'FIN Calculo Percepciones en Ventas e Impuestos Internos');
            //}
                
            /*FDS2** Busco la subsidiaria */
            if (esOneworld())
                var subsidiaria = nlapiGetFieldValue('subsidiary');
            else
                var subsidiaria = null;
            /*FDS2***/
            var total = nlapiGetFieldValue('total');
            /*FDS2* var numeroEnLetras = getNumeroEnLetras(total);*/
            var numeroEnLetras = getNumeroEnLetras(total, subsidiaria);

            if (!isEmpty(numeroEnLetras))
                nlapiSetFieldValue("custbody_l54_monto_escrito", numeroEnLetras);

            // actualizaciÃ³n de lineas por IVA
			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2984 - actualizarLineasPorIvaBeforeSubmit - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());
            actualizarLineasPorIvaBeforeSubmit(subsidiaria);
			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2984 - actualizarLineasPorIvaBeforeSubmit - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());

            // Nuevo Configurar el Codigo de Moneda AFIP
            var monedaId = nlapiGetFieldValue('currency');
            if (!isEmpty(monedaId)) {
                var monedaAFIPId = obtenerIDMoneda(monedaId);
                if (!isEmpty(monedaAFIPId)) {
                    nlapiSetFieldValue("custbody_l54_tipo_moneda", monedaAFIPId);
                }
            }

            // Actualizar ID Transaccion AFIP
            var idTransaccionAFIP = nlapiGetFieldValue('custbody_l54_cod_trans_afip');
			var refNumerador = nlapiGetFieldValue('custbody_l54_ref_numerador');
			nlapiLogExecution('DEBUG','LINE 2867','idTransaccionAFIP: '+idTransaccionAFIP+' - refNumerador: '+refNumerador);
			var esND = nlapiGetFieldValue('custbody_l54_nd');
            var tipoTransStr = nlapiGetRecordType();
            var bocaId = nlapiGetFieldValue("custbody_l54_boca");
            var letraId = nlapiGetFieldValue("custbody_l54_letra");
            var esLiquidoProducto = nlapiGetFieldValue("custbody_l54_liquido_producto");
			var esCreditoElectronico = nlapiGetFieldValue("custbody_l54_es_credito_electronico");
            if (isEmpty(esLiquidoProducto)) {
                esLiquidoProducto = 'F';
            }
            if (isEmpty(esCreditoElectronico)) {
                esCreditoElectronico = 'F';
            }

            var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
			var numeradorArray = consultarNumerador(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico);

			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 3017 - LOG DE CONTROL - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());

			if (!isEmpty(numeradorArray['referencia'])) {
				if (isEmpty(refNumerador) || (refNumerador != numeradorArray['referencia'])) {
					if (nlapiGetFieldValue('custbody_l54_numerador_manual') == 'F') {
							
						var numeradorArrayNuevo = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico);
						
						nlapiSetFieldValue("custbody_l54_ref_numerador", numeradorArrayNuevo['referencia']);
						var resultadoIDAFIP = nlapiLookupField('customrecord_l54_numeradores', numeradorArrayNuevo['referencia'], 'custrecord_l54_num_id_trans_afip');
							
						if (!isEmpty(resultadoIDAFIP)) {
							nlapiSetFieldValue("custbody_l54_cod_trans_afip", resultadoIDAFIP);
						}

						var resultadoNumElectronico = nlapiLookupField('customrecord_l54_numeradores', numeradorArrayNuevo['referencia'], 'custrecord_l54_num_electronico');
							
						if (!isEmpty(resultadoNumElectronico)) {
							nlapiSetFieldValue("custbody_l54_numerador_electronico", resultadoNumElectronico);
						}

						nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 2907 - numerador: ' + numeradorArrayNuevo['numerador'] + ' - numerador prefijo: ' + numeradorArrayNuevo['numeradorPrefijo'] + ' - numeradorElectronico: ' + numeradorArrayNuevo['numeradorElectronico']); 

						nlapiSetFieldValue("custbody_l54_numero", numeradorArrayNuevo['numerador']);
						nlapiSetFieldValue("custbody_l54_numero_localizado", numeradorArrayNuevo['numeradorPrefijo']);
						nlapiSetFieldValue("custbody_l54_numerador_electronico", numeradorArrayNuevo['numeradorElectronico']);

					} else {

						nlapiSetFieldValue("custbody_l54_ref_numerador", numeradorArray['referencia']);
						var resultadoIDAFIP = nlapiLookupField('customrecord_l54_numeradores', numeradorArray['referencia'], 'custrecord_l54_num_id_trans_afip');
							
						if (!isEmpty(resultadoIDAFIP)) {
							nlapiSetFieldValue("custbody_l54_cod_trans_afip", resultadoIDAFIP);
						}

						// if (isEmpty(numeradorElectronico)) {
						var resultadoNumElectronico = nlapiLookupField('customrecord_l54_numeradores', numeradorArray['referencia'], 'custrecord_l54_num_electronico');
						if (!isEmpty(resultadoNumElectronico)) {
							nlapiSetFieldValue("custbody_l54_numerador_electronico", resultadoNumElectronico);
						}
						// }
					}
				} else {
					if (isEmpty(idTransaccionAFIP)) {
						nlapiSetFieldValue("custbody_l54_ref_numerador", numeradorArray['referencia']);
						var resultadoIDAFIP = nlapiLookupField('customrecord_l54_numeradores', numeradorArray['referencia'], 'custrecord_l54_num_id_trans_afip');
						if (!isEmpty(resultadoIDAFIP)) {
							nlapiSetFieldValue("custbody_l54_cod_trans_afip", resultadoIDAFIP);
						}

						// if (isEmpty(numeradorElectronico)) {
						var resultadoNumElectronico = nlapiLookupField('customrecord_l54_numeradores', numeradorArray['referencia'], 'custrecord_l54_num_electronico');
						if (!isEmpty(resultadoNumElectronico)) {
							nlapiSetFieldValue("custbody_l54_numerador_electronico", resultadoNumElectronico);
						}
						// }
					}
				}

				var numero_invoice = nlapiGetFieldValue("custbody_l54_numero");
				var nro_localizado = nlapiGetFieldValue("custbody_l54_numero_localizado");
				var numerador_electronico = nlapiGetFieldValue("custbody_l54_numerador_electronico");

				if (((isEmpty(numero_invoice)) || (isEmpty(nro_localizado))) && (nlapiGetFieldValue('custbody_l54_numerador_manual') == 'F')) {
					var numeradorArrayNuevo = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico);
					nlapiSetFieldValue("custbody_l54_numero", numeradorArrayNuevo['numerador']);
					nlapiSetFieldValue("custbody_l54_numero_localizado", numeradorArrayNuevo['numeradorPrefijo']);
					nlapiSetFieldValue("custbody_l54_numerador_electronico", numeradorArrayNuevo['numeradorElectronico']);
				}
			} else {
				nlapiLogExecution('ERROR', 'l54beforeSubmitTransaction', 'LINE 2940 - ERROR: NO SE ENCUENTRA EL NUMERADOR DE REFERENCIA');
			}

			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 3088 - LOG DE CONTROL - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());

            //Se desmarca el check de la factura aplicada si es el caso
            var idTransApply = [];
            if (nlapiGetRecordType() == 'creditmemo') {
                for (var j = 1; j <= nlapiGetLineItemCount("apply"); j++) {
                    if (nlapiGetLineItemValue('apply', 'apply', j) == 'T') {
                        idTransApply.push({
                            internalId: nlapiGetLineItemValue('apply', 'internalid', j),
                            line: j
                        });
                        nlapiSetLineItemValue('apply', 'apply', j, 'F');
                    }
                }
                nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE-2872. Array of invoice apply: ' + JSON.stringify(idTransApply));
                if (!isEmpty(idTransApply) && idTransApply.length > 0) {
                    for (var j = 0; j < idTransApply.length; j++) {
                        nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE-2876. INVOICE DATA APPLIED (T): ' + idTransApply[j].internalId);
                        nlapiSetLineItemValue('apply', 'apply', idTransApply[j].line, 'T');
                    }
                }
            }

			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 3111 - LOG DE CONTROL - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());

            nlapiSetFieldValue("custbody_l54_reg_inf_trans_act", 'T');

            // Generacion de Concepto de la Transaccion
			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 3116 - verificarTipoItem - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());
            verificarTipoItem(type);
			nlapiLogExecution('DEBUG', 'l54beforeSubmitTransaction', 'LINE 3118 - verificarTipoItem - unidades disponibles: ' + context.getRemainingUsage() + ' - tiempo: ' + new Date());
            nlapiLogExecution('DEBUG', 'BEFORE SUBMIT TRANSACTION EDIT', 'FIN BEFORE SUBMIT TRANSACTION EDIT');
        }
        
	}
	catch(err)
	{
		nlapiLogExecution('ERROR', 'l54beforeSubmitTransaction', 'LINE-2878. Excepción General, Detalle: ' + err.message);
	}
}

function l54afterSubmitTransaction(type) {

	try {
		if (type == 'create') {

			var recId = nlapiGetRecordId();
			var recType = nlapiGetRecordType();
			var record = nlapiLoadRecord(recType, recId);
		
			/* // INICIO CALCULO PERCEPIONES EN VENTAS
			nlapiLogExecution('ERROR', 'Calculo Percepiones', 'INICIO Calculo Percepciones en Ventas');
			calcularPercepcionesVentasAfterSubmit(record);
			nlapiLogExecution('ERROR', 'Calculo Percepiones', 'FIN Calculo Percepciones en Ventas');
			// FIN CALCULO PERCEPIONES EN VENTAS */
		
			nlapiLogExecution('DEBUG', 'AFTER SUBMIT TRANSACTION CREATE', 'INICIO AFTER SUBMIT TRANSACTION CREATE');
			/*FDS2** Busco la subsidiaria */
			if (esOneworld())
				var subsidiaria = record.getFieldValue('subsidiary');
			else
				var subsidiaria = null;
			/*FDS2***/
		
			var total = record.getFieldValue('total');
			var numeroEnLetras = getNumeroEnLetras(total, subsidiaria);
		
			if (!isEmpty(numeroEnLetras))
				record.setFieldValue("custbody_l54_monto_escrito", numeroEnLetras);
		
			/* actualizarLineasPorIvaAfterSubmit(record);
		
			// si se utiliza numerador automatico
			// No se Genera mas Numerador para Factura,Nota de Debito, Nota de Credito, porque lo genera el proceso de Factura Electronica
			if (record.getFieldValue('custbody_l54_numerador_manual') == 'F' && isEmpty(record.getFieldValue('custbody_l54_numero_localizado'))) {
		
				var esND = record.getFieldValue('custbody_l54_nd');
				var tipoTransStr = record.getRecordType();
				var bocaId = record.getFieldValue("custbody_l54_boca");
				var letraId = record.getFieldValue("custbody_l54_letra");
				var esLiquidoProducto = record.getFieldValue("custbody_l54_liquido_producto");
				if (isEmpty(esLiquidoProducto)) {
					esLiquidoProducto = 'F';
				}
				nlapiLogExecution('DEBUG', 'Valor de Es líquido Producto', 'Es líquido producto: ' + esLiquidoProducto);
		
				var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
				var numeradorArray = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto);
		
				record.setFieldValue("custbody_l54_numerador_electronico", numeradorArray['numeradorElectronico']);
				record.setFieldValue("custbody_l54_numero", numeradorArray['numerador']);
				record.setFieldValue("custbody_l54_numero_localizado", numeradorArray['numeradorPrefijo']);
				// Nuevo Almacenar el Tipo de Transaccion AFIP
				//if(!isEmpty(numeradorArray['tipoTransAFIP']))
				//record.setFieldValue("custbody_l54_tipo_trans_afip", numeradorArray['tipoTransAFIP']);
		
				if (!isEmpty(numeradorArray['referencia']))
					record.setFieldValue("custbody_l54_ref_numerador", numeradorArray['referencia']);
		
				// Nuevo Configurar el Codigo de Moneda AFIP
				var monedaId = record.getFieldValue('currency');
				if (!isEmpty(monedaId)) {
					var monedaAFIPId = obtenerIDMoneda(monedaId);
					if (!isEmpty(monedaAFIPId)) {
						record.setFieldValue("custbody_l54_tipo_moneda", monedaAFIPId);
					}
				}
			} else {
				var esND = record.getFieldValue('custbody_l54_nd');
				var tipoTransStr = record.getRecordType();
				var bocaId = record.getFieldValue("custbody_l54_boca");
				var letraId = record.getFieldValue("custbody_l54_letra");
				var esLiquidoProducto = record.nlapiGetFieldValue("custbody_l54_liquido_producto");
				if (isEmpty(esLiquidoProducto)) {
					esLiquidoProducto = 'F';
				}
				nlapiLogExecution('DEBUG', 'Valor de Es líquido Producto', 'Es líquido producto: ' + esLiquidoProducto);
		
				var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
				var numeradorArray = consultarNumerador(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto);
		
				// Nuevo Almacenar el Tipo de Transaccion AFIP
				//if(!isEmpty(numeradorArray['tipoTransAFIP']))
				//record.setFieldValue("custbody_l54_tipo_trans_afip", numeradorArray['tipoTransAFIP']);
		
				if (!isEmpty(numeradorArray['referencia']))
					record.setFieldValue("custbody_l54_ref_numerador", numeradorArray['referencia']);
		
				// Nuevo Configurar el Codigo de Moneda AFIP
				var monedaId = record.getFieldValue('currency');
				if (!isEmpty(monedaId)) {
					var monedaAFIPId = obtenerIDMoneda(monedaId);
					if (!isEmpty(monedaAFIPId)) {
						record.setFieldValue("custbody_l54_tipo_moneda", monedaAFIPId);
					}
				}
			}
		
			record.setFieldValue("custbody_l54_reg_inf_trans_act", 'T');*/
			nlapiLogExecution('DEBUG', 'AFTER SUBMIT TRANSACTION', 'FIN AFTER SUBMIT TRANSACTION CREATE');
			try {
				var idTmp = nlapiSubmitRecord(record, true);
				nlapiLogExecution('DEBUG', 'AFTER SUBMIT TRANSACTION', 'Se grabo la transacción exitosamente (Create), id de la transacción: ' + idTmp);
			} catch (e) {
				nlapiLogExecution('ERROR', 'AFTER SUBMIT TRANSACTION', 'LINE-2984. Error al actualizar en l54AfterSubmitTransaction (create), error: ' + e.message);
			}
		}
		
		if (type == 'edit') {
		
			var recId = nlapiGetRecordId();
			var recType = nlapiGetRecordType();
			var record = nlapiLoadRecord(recType, recId);
		
			nlapiLogExecution('DEBUG', 'AFTER SUBMIT TRANSACTION', 'INICIO AFTER SUBMIT TRANSACTION EDIT');
			/*FDS2** Busco la subsidiaria */
			if (esOneworld())
				var subsidiaria = record.getFieldValue('subsidiary');
			else
				var subsidiaria = null;
			/*FDS2***/
		
		
			var total = record.getFieldValue('total');
			var numeroEnLetras = getNumeroEnLetras(total, subsidiaria);
		
			if (!isEmpty(numeroEnLetras))
				record.setFieldValue("custbody_l54_monto_escrito", numeroEnLetras);
			/* // actualizaciÃ³n de lineas por IVA
			actualizarLineasPorIvaAfterSubmit(record);
		
			// Nuevo Configurar el Codigo de Moneda AFIP
			var monedaId = record.getFieldValue('currency');
			if (!isEmpty(monedaId)) {
				var monedaAFIPId = obtenerIDMoneda(monedaId);
				if (!isEmpty(monedaAFIPId)) {
					record.setFieldValue("custbody_l54_tipo_moneda", monedaAFIPId);
				}
			}
		
			// Actualizar ID Transaccion AFIP
			var idTransaccionAFIP = record.getFieldValue('custbody_l54_cod_trans_afip');
			if (isEmpty(idTransaccionAFIP)) {
				var refNumerador = record.getFieldValue('custbody_l54_ref_numerador');
				if (!isEmpty(refNumerador)) {
					var resultadoIDAFIP = nlapiLookupField('customrecord_l54_numeradores', refNumerador, 'custrecord_l54_num_id_trans_afip');
					if (!isEmpty(resultadoIDAFIP)) {
						record.setFieldValue("custbody_l54_cod_trans_afip", resultadoIDAFIP);
					}
				} else {
					var esND = record.getFieldValue('custbody_l54_nd');
					var tipoTransStr = record.getRecordType();
					var bocaId = record.getFieldValue("custbody_l54_boca");
					var letraId = record.getFieldValue("custbody_l54_letra");
					var esLiquidoProducto = record.getFieldValue("custbody_l54_liquido_producto");
					if (isEmpty(esLiquidoProducto)) {
						esLiquidoProducto = 'F';
					}
					nlapiLogExecution('DEBUG', 'Valor de Es líquido Producto', 'Es líquido producto: ' + esLiquidoProducto);
		
					var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
					var numeradorArray = consultarNumerador(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto);
		
					// Nuevo Almacenar el Tipo de Transaccion AFIP
					if(!isEmpty(numeradorArray['tipoTransAFIP']))
					record.setFieldValue("custbody_l54_tipo_trans_afip", numeradorArray['tipoTransAFIP']);
		
					if (!isEmpty(numeradorArray['referencia'])) {
						record.setFieldValue("custbody_l54_ref_numerador", numeradorArray['referencia']);
						var resultadoIDAFIP = nlapiLookupField('customrecord_l54_numeradores', numeradorArray['referencia'], 'custrecord_l54_num_id_trans_afip');
						if (!isEmpty(resultadoIDAFIP)) {
							record.setFieldValue("custbody_l54_cod_trans_afip", resultadoIDAFIP);
						}
					}
				}
			}
		
			record.setFieldValue("custbody_l54_reg_inf_trans_act", 'T'); */
		
			nlapiLogExecution('DEBUG', 'AFTER SUBMIT TRANSACTION', 'FIN AFTER SUBMIT TRANSACTION EDIT');
			try
			{
				var idTmp = nlapiSubmitRecord(record, true);
				nlapiLogExecution('DEBUG', 'AFTER SUBMIT TRANSACTION', 'Se grabo la transacción exitosamente (edit), id de la transacción: ' + idTmp);
			} catch (e) {
				nlapiLogExecution('ERROR', 'AFTER SUBMIT TRANSACTION',  'LINE-3065. Error al actualizar en l54AfterSubmitTransaction (edit), error: ' + e.message);
			}
		}
	} catch (error) {
		nlapiLogExecution('ERROR', 'l54afterSubmitTransaction', 'LINE-3102. Excepción General, Detalle: ' + error.message);
	}
}

// customer payment
/*
function l54beforeSubmitCustomerpayment(type){

if (type == 'create'){

var tipoTransStr = 'customerpayment';
var esND = nlapiGetFieldValue('custbody_l54_nd');
var bocaId = nlapiGetFieldValue("custbody_l54_boca");
var letraId = nlapiGetFieldValue("custbody_l54_letra");

// si se utiliza numerador automatico
if ( nlapiGetFieldValue('custbody_l54_numerador_manual') == 'F' && isEmpty(nlapiGetFieldValue('custbody_l54_numero_localizado'))){

if (esOneworld())
var subsidiaria = nlapiGetFieldValue('subsidiary');
else
var subsidiaria = null;

var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
var numeradorArray = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria);

nlapiSetFieldValue("custbody_l54_numero", numeradorArray['numerador']);
nlapiSetFieldValue("custbody_l54_numero_localizado", numeradorArray['numeradorPrefijo']);
}
}

if (type == 'create' || type == 'edit'){

var total = nlapiGetFieldValue('total');

var numeroEnLetras = getNumeroEnLetras(total);

if (!isEmpty(numeroEnLetras)){

nlapiSetFieldValue ("custbody_l54_monto_escrito", numeroEnLetras);
nlapiSetFieldValue ("memo", numeroEnLetras);
}
}
}
 */

function l54beforeSubmitCustomerpayment(type) {
	
	try {
		if (type == 'create') {
			var recType = nlapiGetRecordType();
			var filtroNumerador = [];
			var columnaNumerador = [];
			var tipoTransId = '';
			var tipoTransStr = recType;
			var esND = nlapiGetFieldValue('custbody_l54_nd');

			if (isEmpty(esND))
				esND = 'F';

			if (esOneworld())
				var subsidiaria = nlapiGetFieldValue('subsidiary');
			else
				var subsidiaria = null;
				
			tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
			filtroNumerador[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
			filtroNumerador[1] = new nlobjSearchFilter('custrecord_l54_num_tipo_trans', null, 'anyof', tipoTransId);
			filtroNumerador[2] = new nlobjSearchFilter('custrecord_l54_num_preferido', null, 'is', 'T');
			
			if (!isEmpty(subsidiaria))
				filtroNumerador[3] = new nlobjSearchFilter('custrecord_l54_num_subsidiaria', null, 'is', subsidiaria);

			columnaNumerador[0] = new nlobjSearchColumn('id');
			columnaNumerador[1] = new nlobjSearchColumn('custrecord_l54_num_letra');
			columnaNumerador[2] = new nlobjSearchColumn('custrecord_l54_num_boca');

			var resultadoNumerador = new nlapiSearchRecord('customrecord_l54_numeradores', null, filtroNumerador, columnaNumerador);
			if (!isEmpty(resultadoNumerador) && resultadoNumerador.length > 0) {
				nlapiLogExecution('DEBUG', 'l54beforeSubmitCustomerpayment', 'LINE 3181 - ID del numerador preferido: ' + resultadoNumerador[0].getValue('id'));
				nlapiSetFieldValue('custbody_l54_letra', resultadoNumerador[0].getValue('custrecord_l54_num_letra'));
				nlapiSetFieldValue('custbody_l54_boca', resultadoNumerador[0].getValue('custrecord_l54_num_boca'));
			} else {
				nlapiLogExecution('DEBUG', 'l54beforeSubmitCustomerpayment', 'LINE 3185 - No se encontraron resultados para el Numerador Preferido de la Transacción');
			}
		}
	} catch (error) {
		nlapiLogExecution('ERROR', 'l54beforeSubmitCustomerpayment', 'LINE-3189. Excepción General, Detalle: ' + error.message);
	}
}

function l54afterSubmitCustomerpayment(type) {

	try {
		if (type == 'create') {

			var recId = nlapiGetRecordId();
			var recType = nlapiGetRecordType();
			
			if(!isEmpty(recId) && recId!=0 && !isEmpty(recType)){
			
				var record = nlapiLoadRecord(recType, recId);
				

				/*FDS2** Busco la subsidiaria*/
				if (esOneworld())
					var subsidiaria = record.getFieldValue('subsidiary');
				else
					var subsidiaria = null;
				/*FDS2*/

				var total = record.getFieldValue('total');
				/*FDS2* var numeroEnLetras = getNumeroEnLetras(total);*/
				var numeroEnLetras = getNumeroEnLetras(total, subsidiaria);

				if (!isEmpty(numeroEnLetras)) {

					record.setFieldValue("custbody_l54_monto_escrito", numeroEnLetras);
					//Sin Monto escrito en campo memo
					//record.setFieldValue("memo", numeroEnLetras);
				}

				// si se utiliza numerador automatico
				if (record.getFieldValue('custbody_l54_numerador_manual') == 'F' && isEmpty(record.getFieldValue('custbody_l54_numero_localizado'))) {

					var tipoTransStr = 'customerpayment';
					var esND = record.getFieldValue('custbody_l54_nd');
					var bocaId = record.getFieldValue("custbody_l54_boca");
					var letraId = record.getFieldValue("custbody_l54_letra");
					var esLiquidoProducto = record.getFieldValue("custbody_l54_liquido_producto");
					var esCreditoElectronico = record.getFieldValue("custbody_l54_es_credito_electronico");

					if (isEmpty(esLiquidoProducto)) {
						esLiquidoProducto = 'F';
					}
					if (isEmpty(esCreditoElectronico)) {
						esCreditoElectronico = 'F';
					}
					nlapiLogExecution('DEBUG', 'l54afterSubmitCustomerpayment', 'esLiquidoProducto: ' + esLiquidoProducto+' - esCreditoElectronico: '+esCreditoElectronico);
					/*FDS2**
					if (esOneworld())
					var subsidiaria = record.getFieldValue('subsidiary');
					else
					var subsidiaria = null;
					*/
					var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
					var numeradorArray = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico);

					record.setFieldValue("custbody_l54_numero", numeradorArray['numerador']);
					record.setFieldValue("custbody_l54_numero_localizado", numeradorArray['numeradorPrefijo']);
				}

				try {
					var idTmp = nlapiSubmitRecord(record, true);
					nlapiLogExecution('DEBUG', 'Se grabo el customerpayment exitosamente (Create)', 'Id: ' + idTmp);
				} catch (e) {
					nlapiLogExecution('ERROR', 'Error grabando el customerpayment (Create)', 'NetSuite error: ' + e.message);
				}
			}
		}

		if (type == 'edit') {

			var recId = nlapiGetRecordId();
			var recType = nlapiGetRecordType();
			var record = nlapiLoadRecord(recType, recId);

			/*FDS2** Busco la subsidiaria*/
			if (esOneworld())
				var subsidiaria = record.getFieldValue('subsidiary');
			else
				var subsidiaria = null;
			/*FDS2*/

			var total = record.getFieldValue('total');
			/*FDS2* var numeroEnLetras = getNumeroEnLetras(total);*/
			var numeroEnLetras = getNumeroEnLetras(total, subsidiaria);

			if (!isEmpty(numeroEnLetras)) {

				record.setFieldValue("custbody_l54_monto_escrito", numeroEnLetras);
				//Sin Monto escrito en campo memo
				//record.setFieldValue("memo", numeroEnLetras);
			}

			try {
				var idTmp = nlapiSubmitRecord(record, true);
				nlapiLogExecution('DEBUG', 'Se grabo el customerpayment exitosamente (Edit)', 'Id: ' + idTmp);
			} catch (e) {
				nlapiLogExecution('ERROR', 'Error grabando el customerpayment (Edit)', 'NetSuite error: ' + e.message);
			}
		}
	} catch (error) {
		nlapiLogExecution('ERROR', 'l54afterSubmitCustomerpayment', 'LINE-3293. Excepción General, Detalle: ' + error.message);
	}
}

// itemfulfillment
/*
function l54beforeSubmitItemfulfillment(type){

if (type == 'create'){

var tipoTransStr = 'itemfulfillment';
var esND = nlapiGetFieldValue('custbody_l54_nd');
var bocaId = nlapiGetFieldValue("custbody_l54_boca");
var letraId = nlapiGetFieldValue("custbody_l54_letra");

// si se utiliza numerador automatico
if ( nlapiGetFieldValue('custbody_l54_numerador_manual') == 'F' && isEmpty(nlapiGetFieldValue('custbody_l54_numero_localizado'))){

if (esOneworld())
var subsidiaria = nlapiGetFieldValue('subsidiary');
else
var subsidiaria = null;

var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
var numeradorArray = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria);

nlapiSetFieldValue("custbody_l54_numero", numeradorArray['numerador']);
nlapiSetFieldValue("custbody_l54_numero_localizado", numeradorArray['numeradorPrefijo']);
}
}
}
 */

function l54afterSubmitItemfulfillment(type) {

	if (type == 'create') {

		var recId = nlapiGetRecordId();
		var recType = nlapiGetRecordType();
		var record = nlapiLoadRecord(recType, recId);

		// si se utiliza numerador automatico
		if (record.getFieldValue('custbody_l54_numerador_manual') == 'F' && isEmpty(record.getFieldValue('custbody_l54_numero_localizado'))) {

			var tipoTransStr = 'itemfulfillment';
			var esND = record.getFieldValue('custbody_l54_nd');
			var bocaId = record.getFieldValue("custbody_l54_boca");
			var letraId = record.getFieldValue("custbody_l54_letra");
			var esLiquidoProducto = record.getFieldValue("custbody_l54_liquido_producto");
			var esCreditoElectronico = record.getFieldValue("custbody_l54_es_credito_electronico");
			if (isEmpty(esLiquidoProducto)) {
				esLiquidoProducto = 'F';
			}
			if (isEmpty(esCreditoElectronico)) {
				esCreditoElectronico = 'F';
			}
			nlapiLogExecution('DEBUG', 'l54afterSubmitItemfulfillment', 'Es líquido producto: ' + esLiquidoProducto+' - esCreditoElectronico: '+esCreditoElectronico);

			if (esOneworld())
				var subsidiaria = record.getFieldValue('subsidiary');
			else
				var subsidiaria = null;

			var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
			var numeradorArray = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico);

			record.setFieldValue("custbody_l54_numero", numeradorArray['numerador']);
			record.setFieldValue("custbody_l54_numero_localizado", numeradorArray['numeradorPrefijo']);

			try {
				var idTmp = nlapiSubmitRecord(record, true);
				nlapiLogExecution('DEBUG', 'Se grabo el ItemFulFillment exitosamente (Create)', 'Id: ' + idTmp);
			} catch (e) {
				nlapiLogExecution('ERROR', 'Error grabando el ItemFulFillment (Create)', 'NetSuite error: ' + e.message);
			}
		}
	}
}

// check
function l54loadCheck(type, form) {

	if (type == 'view') {

		form.setScript('customscript_l54_enlace_l54_ret_v2012');
		form.addButton('custpage_imprimir_cheque', 'Imprimir Cheque', "imprimirCheque()");
	}
}

/*
function l54beforeSubmitCheck(type){

if (type == 'create'){

var tipoTransStr = 'check';
var tipoTransId = getTipoTransId(tipoTransStr);
var bocaId = nlapiGetFieldValue("custbody_l54_boca");
var letraId = nlapiGetFieldValue("custbody_l54_letra");

// si se utiliza numerador automatico
if ( nlapiGetFieldValue('custbody_l54_numerador_manual') == 'F' && isEmpty(nlapiGetFieldValue('custbody_l54_numero_localizado'))){

if (esOneworld())
var subsidiaria = nlapiGetFieldValue('subsidiary');
else
var subsidiaria = null;

var numeradorArray = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria);

nlapiSetFieldValue("custbody_l54_numero", numeradorArray['numerador']);
nlapiSetFieldValue("custbody_l54_numero_localizado", numeradorArray['numeradorPrefijo']);
}
}

if (type == 'create' || type == 'edit'){

var total = nlapiGetFieldValue("usertotal");
var numeroEnLetras = getNumeroEnLetras(total);
numeroEnLetras = numeroEnLetras.substr(4); // le saco la palabra Son

if (!isEmpty(numeroEnLetras)){

nlapiSetFieldValue ("custbody_l54_monto_escrito", numeroEnLetras);
nlapiSetFieldValue ("memo", numeroEnLetras);
}
}
}
 */

function l54afterSubmitCheck(type) {

	if (type == 'create') {

		var recId = nlapiGetRecordId();
		var recType = nlapiGetRecordType();
		var record = nlapiLoadRecord(recType, recId);

		/*FDS2** busco la subsidiaria*/
		if (esOneworld())
			var subsidiaria = record.getFieldValue('subsidiary');
		else
			var subsidiaria = null;
		/*FDS2*/

		var total = record.getFieldValue("usertotal");
		/*FDS2** var numeroEnLetras = getNumeroEnLetras(total);**/
		var numeroEnLetras = getNumeroEnLetras(total, subsidiaria);

		numeroEnLetras = numeroEnLetras.substr(4); // le saco la palabra Son

		if (!isEmpty(numeroEnLetras)) {

			record.setFieldValue("custbody_l54_monto_escrito", numeroEnLetras);
			record.setFieldValue("memo", numeroEnLetras);
		}

		// si se utiliza numerador automatico
		if (record.getFieldValue('custbody_l54_numerador_manual') == 'F' && isEmpty(record.getFieldValue('custbody_l54_numero_localizado'))) {

			var tipoTransStr = 'check';
			var tipoTransId = getTipoTransId(tipoTransStr);
			var bocaId = record.getFieldValue("custbody_l54_boca");
			var letraId = record.getFieldValue("custbody_l54_letra");
			var esLiquidoProducto = record.getFieldValue("custbody_l54_liquido_producto");
			var esCreditoElectronico = record.getFieldValue("custbody_l54_es_credito_electronico");
			if (isEmpty(esLiquidoProducto)) {
				esLiquidoProducto = 'F';
			}
			if (isEmpty(esCreditoElectronico)) {
				esCreditoElectronico = 'F';
			}
			nlapiLogExecution('DEBUG', 'l54afterSubmitCheck', 'esLiquidoProducto: ' + esLiquidoProducto+' - esCreditoElectronico: '+esCreditoElectronico);

			/*FDS2**
			if (esOneworld())
			var subsidiaria = record.getFieldValue('subsidiary');
			else
			var subsidiaria = null;
			 *FDS2*/
			var numeradorArray = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico);

			record.setFieldValue("custbody_l54_numero", numeradorArray['numerador']);
			record.setFieldValue("custbody_l54_numero_localizado", numeradorArray['numeradorPrefijo']);
		}

		try {
			var idTmp = nlapiSubmitRecord(record, true);
			nlapiLogExecution('DEBUG', 'Se grabo el Cheque exitosamente (Create)', 'Id: ' + idTmp);
		} catch (e) {
			nlapiLogExecution('ERROR', 'Error grabando el Cheque (Create)', 'NetSuite error: ' + e.message);
		}
	}

	if (type == 'edit' || type == 'xedit') {

		var recId = nlapiGetRecordId();
		var recType = nlapiGetRecordType();
		var record = nlapiLoadRecord(recType, recId);

		/*FDS2** busco la subsidiaria*/
		if (esOneworld())
			var subsidiaria = record.getFieldValue('subsidiary');
		else
			var subsidiaria = null;
		/*FDS2*/

		var total = record.getFieldValue("usertotal");
		/*FDS2** var numeroEnLetras = getNumeroEnLetras(total);**/
		var numeroEnLetras = getNumeroEnLetras(total, subsidiaria);
		numeroEnLetras = numeroEnLetras.substr(4); // le saco la palabra Son

		if (!isEmpty(numeroEnLetras)) {

			record.setFieldValue("custbody_l54_monto_escrito", numeroEnLetras);
			record.setFieldValue("memo", numeroEnLetras);
		}

		try {
			var idTmp = nlapiSubmitRecord(record, true);
			nlapiLogExecution('DEBUG', 'Se actualizo el Cheque exitosamente (Edit)', 'Id: ' + idTmp);
		} catch (e) {
			nlapiLogExecution('ERROR', 'Error actualizando el Cheque (Edit)', 'NetSuite error: ' + e.message);
		}
	}
}

// retenciones
// -------------------------------------------------------------

function l54loadVendorpayment(type, form) {
	
	/*var tipo_retencion_ganancias = 1; // ID Ganancias
	var tipo_retencion_iva = 2; // ID IVA
	var tipo_retencion_iibb = 3; // ID IIBB
	var tipo_retencion_suss	= 4; // ID SUSS*/

	var linea = 1;

	if (type == 'create') {

		// Si la compaÃ±ia es agente de retenciÃ³n de ganancias o SUSS, entonces muestro la solapa 'Calculo retenciones'
		//if (esAgenteRetencion('gan') || esAgenteRetencion('suss') || esAgenteRetencion('iva') || esAgenteRetencion('iibb')) {

			var SampleTab = form.addTab('custpage_retenciones', 'Cálculo de Retenciones');

			var SublistRetenciones = form.addSubList('custpage_sublist_retenciones', 'inlineeditor', 'Retenciones', 'custpage_retenciones');
			//var SublistRetenciones = form.addSubList('custpage_sublist_retenciones', 'list', 'Retenciones', 'custpage_retenciones');
			SublistRetenciones.addField('custrecord_l54_ret_retencion', 'select', 'Retencion', 'customlist_l54_agentes_retencion').setDisplayType('disabled');
			SublistRetenciones.addField('custrecord_l54_ret_tipo_ret', 'select', 'Tipo Ret.', 'customrecord_l54_param_ret').setDisplayType('disabled');
			SublistRetenciones.addField('custrecord_l54_ret_porcentaje', 'float', 'Alicuota').setDisplayType('disabled');
			SublistRetenciones.addField('custrecord_l54_ret_jurisdiccion', 'select', 'Jurisdiccion', 'customrecord_l54_zona_impuestos').setDisplayType('disabled');
			SublistRetenciones.addField('custrecord_l54_ret_condicion', 'text', 'CondiciÃ³n').setDisplayType('disabled');
			SublistRetenciones.addField('custrecord_l54_ret_net_bill', 'currency', 'Neto Bill. Aplic.');
			SublistRetenciones.addField('custrecord_l54_ret_base_calculo_imp', 'currency', 'Base de CÃ¡lculo');

			SublistRetenciones.addField('custrecord_l54_ret_imp_a_retener', 'currency', 'Imp. a retener');
			//SublistRetenciones.addField('custrecord_l54_ret_cuenta', 'text', '').setDisplayType('disabled');

			// Nuevo - ID de Tipo Contribuyente
			SublistRetenciones.addField('custrecord_l54_ret_id_tipo_contr', 'text', '');
			SublistRetenciones.addField('custrecord_l54_ret_id_tipo_exen', 'text', '');
			SublistRetenciones.addField('custrecord_l54_ret_cert_exen', 'text', '');
			SublistRetenciones.addField('custrecord_l54_ret_fecha_exen', 'date', '');
			SublistRetenciones.addField('custrecord_l54_ret_diferencia_redondeo', 'float').setDisplayType('hidden');
			SublistRetenciones.addField('custrecord_l54_ret_importe_ret_original', 'float').setDisplayType('hidden');
			SublistRetenciones.addField('custrecord_l54_ret_base_calculo_original', 'float').setDisplayType('hidden');
			SublistRetenciones.addField('custrecord_l54_ret_monto_suj_ret_mon_loc', 'float').setDisplayType('hidden');

			var campoSistemaPermitirInsertar = SublistRetenciones.addField('custrecord_l54_ret_sistema_insertar', 'checkbox', '');
			campoSistemaPermitirInsertar.setDisplayType('disabled');
			var campoSistemaPermitirEliminar = SublistRetenciones.addField('custrecord_l54_ret_sistema_eliminar', 'checkbox', '');
			campoSistemaPermitirEliminar.setDisplayType('disabled');
			SublistRetenciones.addField('custrecord_l54_ret_base_calculo', 'currency', '').setDisplayType('disabled');

		//}

		form.setScript('customscript_l54_enlace_l54_ret_v2012');
		form.addButton('custpage_calcular_retenciones', 'Calcular Retenciones', "calcularRetenciones()");
		form.addButton('custpage_cancelar_retenciones', 'Cancelar Retenciones', "cancelarRetenciones()");


		//Funcionalidad  l54pageInitVendorpayment - ANTES DE LA FUNCIÓN DE CARGA - INICIO
		//Esto se adaptó ya que la funcionalidad de pagos masivos crea los pagos de proveedor pero no se ejecutan los script de clientes implementados en este tipo de transacción.
		var letraStr = 'X';
		var letraId = getLetraId(letraStr);

		nlapiSetFieldValue('custbody_l54_boca', obtenerPuntoVenta());
		nlapiSetFieldValue('custbody_l54_letra', letraId);
		//Funcionalidad  l54pageInitVendorpayment - ANTES DE LA FUNCIÓN DE CARGA - FINs
	}

	//if (type == 'edit'){
	if (type == 'view' || type == 'edit') {
		var recId = nlapiGetRecordId();
		var recType = nlapiGetRecordType();

		//if (esAgenteRetencion('gan') || esAgenteRetencion('suss') || esAgenteRetencion('iva') || esAgenteRetencion('iibb')) {
			var SampleTab = form.addTab('custpage_retenciones', 'Cálculo de Retenciones');

			var SublistRetenciones = form.addSubList('custpage_sublist_retenciones', 'inlineeditor', 'Retenciones', 'custpage_retenciones');
			//var SublistRetenciones = form.addSubList('custpage_sublist_retenciones', 'list', 'Retenciones', 'custpage_retenciones');
			SublistRetenciones.addField('custrecord_l54_ret_retencion', 'select', 'Retencion', 'customlist_l54_agentes_retencion').setDisplayType('disabled');
			SublistRetenciones.addField('custrecord_l54_ret_tipo_ret', 'select', 'Tipo Ret.', 'customrecord_l54_param_ret').setDisplayType('disabled');
			SublistRetenciones.addField('custrecord_l54_ret_porcentaje', 'float', 'Alicuota').setDisplayType('disabled');
			SublistRetenciones.addField('custrecord_l54_ret_jurisdiccion', 'select', 'Jurisdiccion', 'customrecord_l54_zona_impuestos').setDisplayType('disabled');
			SublistRetenciones.addField('custrecord_l54_ret_condicion', 'text', 'CondiciÃ³n').setDisplayType('disabled');
			SublistRetenciones.addField('custrecord_l54_ret_net_bill', 'currency', 'Neto Bill. Aplic.');
			SublistRetenciones.addField('custrecord_l54_ret_base_calculo_imp', 'currency', 'Base de CÃ¡lculo');

			SublistRetenciones.addField('custrecord_l54_ret_imp_a_retener', 'currency', 'Imp. a retener');
			//SublistRetenciones.addField('custrecord_l54_ret_cuenta', 'text', '').setDisplayType('disabled');


			if (type == 'edit') {
				var campoSistemaPermitirInsertar = SublistRetenciones.addField('custrecord_l54_ret_sistema_insertar', 'checkbox', '');
				campoSistemaPermitirInsertar.setDisplayType('disabled');
				var campoSistemaPermitirEliminar = SublistRetenciones.addField('custrecord_l54_ret_sistema_eliminar', 'checkbox', '');
				campoSistemaPermitirEliminar.setDisplayType('disabled');
				SublistRetenciones.addField('custrecord_l54_ret_base_calculo', 'currency', '').setDisplayType('disabled');

				// Nuevo - ID de Tipo Contribuyente
				SublistRetenciones.addField('custrecord_l54_ret_id_tipo_contr', 'text', '');
				SublistRetenciones.addField('custrecord_l54_ret_id_tipo_exen', 'text', '');
				SublistRetenciones.addField('custrecord_l54_ret_cert_exen', 'text', '');
				SublistRetenciones.addField('custrecord_l54_ret_fecha_exen', 'date', '');

				// Verifico si el Pago no posee Retenciones muestro el Boton de Calcular Retenciones
				/*var filtroPago = new Array();
				filtroPago[0] = new nlobjSearchFilter('internalid', null, 'is', recId);
				filtroPago[1] = new nlobjSearchFilter('voided', null, 'is', 'F');
				filtroPago[2] = new nlobjSearchFilter('custbody_l54_ret_iibb_numerador', null, 'isempty', null);
				filtroPago[3] = new nlobjSearchFilter('custbody_l54_ret_iva_numerador', null, 'isempty', null);
				filtroPago[4] = new nlobjSearchFilter('custbody_l54_ret_suss_numerador', null, 'isempty', null);
				filtroPago[5] = new nlobjSearchFilter('custbody_l54_ret_gan_numerador', null, 'isempty', null);
				var columnaPago = new Array();
				columnaPago[0] = new nlobjSearchColumn('internalid');

				var resultadoPago = new nlapiSearchRecord('vendorpayment', null, filtroPago, columnaPago);

				if(!isEmpty(resultadoPago) && resultadoPago.length>0){

				form.addButton('custpage_imprimir_retenciones', 'Imprimir Retenciones', "imprimirRetenciones()");

				}*/
			}

			//nlapiLogExecution('DEBUG', 'Load Vendor Payment.', 'ID Record : ' + recId);

			var filtroRetenciones = new nlobjSearchFilter('custrecord_l54_ret_ref_pago_prov', null, 'is', recId);
			var columnaRetenciones = new Array();
			columnaRetenciones[0] = new nlobjSearchColumn('internalid');
			columnaRetenciones[1] = new nlobjSearchColumn('custrecord_l54_ret_cod_retencion');
			columnaRetenciones[2] = new nlobjSearchColumn('custrecord_l54_ret_tipo');
			columnaRetenciones[3] = new nlobjSearchColumn('custrecord_l54_ret_neto_bill_aplicado');
			columnaRetenciones[4] = new nlobjSearchColumn('custrecord_l54_ret_base_calculo');
			columnaRetenciones[5] = new nlobjSearchColumn('custrecord_l54_ret_importe');
			columnaRetenciones[6] = new nlobjSearchColumn('custrecord_l54_ret_condicion');
			columnaRetenciones[7] = new nlobjSearchColumn('custrecord_l54_ret_base_calculo_imp');
			columnaRetenciones[8] = new nlobjSearchColumn('custrecord_l54_ret_jurisdiccion');
			columnaRetenciones[9] = new nlobjSearchColumn('custrecord_l54_ret_tipo_contrib_iibb');
			columnaRetenciones[10] = new nlobjSearchColumn('custrecord_l54_ret_alicuota');
			columnaRetenciones[11] = new nlobjSearchColumn('custrecord_l54_ret_tipo_exencion');
			columnaRetenciones[12] = new nlobjSearchColumn('custrecord_l54_ret_cert_exencion');
			columnaRetenciones[13] = new nlobjSearchColumn('custrecord_l54_ret_fecha_exencion');

			var resultadoRetenciones = new nlapiSearchRecord('customrecord_l54_retencion', null, filtroRetenciones, columnaRetenciones);

			for (var i = 1; resultadoRetenciones != null && i <= resultadoRetenciones.length; i++) {

				SublistRetenciones.setLineItemValue('custrecord_l54_ret_tipo_ret', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_cod_retencion'));
				SublistRetenciones.setLineItemValue('custrecord_l54_ret_retencion', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_tipo'));
				SublistRetenciones.setLineItemValue('custrecord_l54_ret_porcentaje', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_alicuota'));
				SublistRetenciones.setLineItemValue('custrecord_l54_ret_jurisdiccion', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_jurisdiccion'));
				SublistRetenciones.setLineItemValue('custrecord_l54_ret_condicion', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_condicion'));
				SublistRetenciones.setLineItemValue('custrecord_l54_ret_net_bill', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_neto_bill_aplicado'));
				//SublistRetenciones.setLineItemValue('custrecord_l54_ret_base_calculo', i , resultadoRetenciones[i-1].getValue('custrecord_l54_ret_base_calculo'));
				SublistRetenciones.setLineItemValue('custrecord_l54_ret_base_calculo_imp', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_base_calculo_imp'));
				SublistRetenciones.setLineItemValue('custrecord_l54_ret_imp_a_retener', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_importe'));
				//SublistRetenciones.setLineItemValue('custrecord_l54_ret_cuenta', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_cuenta'));
				// Nuevo - ID Tipo Contribuyente
				if (resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_tipo') == 3 && !isEmpty(resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_tipo_contrib_iibb'))) {
					SublistRetenciones.setLineItemValue('custrecord_l54_ret_tipo_contrib_iibb', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_tipo_contrib_iibb'));
				}

				if (type == 'edit') {
					SublistRetenciones.setLineItemValue('custrecord_l54_ret_sistema_insertar', i, 'T');
					SublistRetenciones.setLineItemValue('custrecord_l54_ret_sistema_eliminar', i, 'F');

					SublistRetenciones.setLineItemValue('custrecord_l54_ret_id_tipo_exen', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_tipo_exencion'));
					SublistRetenciones.setLineItemValue('custrecord_l54_ret_cert_exen', i, resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_cert_exencion'));
					var fechaExencion = resultadoRetenciones[i - 1].getValue('custrecord_l54_ret_fecha_exencion');
					if (!isEmpty(fechaExencion)) {
						var fechaExencionDate = nlapiStringToDate(fechaExencion);
						if (!isEmpty(fechaExencionDate)) {
							var fechaExencionString = nlapiDateToString(fechaExencionDate, 'date');
							SublistRetenciones.setLineItemValue('custrecord_l54_ret_fecha_exen', i, fechaExencionString);
						}
					}
				}
			}
		//}

	}

	if (type == 'view') {

		var id_je_vendorpayment = nlapiGetFieldValue('custbody_l54_id_je_vendorpayment');

		form.setScript('customscript_l54_enlace_l54_ret_v2012');

		// Verifico si el Pago Esta Anulado no Muestro el Boton de Imprimir Retenciones, tampoco lo muestro si no tiene retenciones generadas
		/*var filtroPago = new Array();
		filtroPago[0] = new nlobjSearchFilter('internalid', null, 'is', recId);
		filtroPago[1] = new nlobjSearchFilter('voided', null, 'is', 'F');
		filtroPago[2] = new nlobjSearchFilter('custbody_l54_ret_iibb_numerador', null, 'isnotempty', null);
		filtroPago[3] = new nlobjSearchFilter('custbody_l54_ret_iva_numerador', null, 'isnotempty', null);
		filtroPago[4] = new nlobjSearchFilter('custbody_l54_ret_suss_numerador', null, 'isnotempty', null);
		filtroPago[5] = new nlobjSearchFilter('custbody_l54_ret_gan_numerador', null, 'isnotempty', null);*/

		var filtroPago = [
			[
				['internalid', 'is', recId], 'AND',
				['voided', 'is', 'F']
			], 'AND',
			[
				['custbody_l54_ret_calculadas', 'is', 'T']
			]
		];

		var columnaPago = new Array();
		columnaPago[0] = new nlobjSearchColumn('internalid');

		var resultadoPago = new nlapiSearchRecord('vendorpayment', null, filtroPago, columnaPago);

		if (!isEmpty(resultadoPago) && resultadoPago.length > 0) {

			//form.addButton('custpage_imprimir_retenciones', 'Imprimir Retenciones', "imprimirRetenciones()");

		}

		// Si se genera el Journal Entry exitosamente, entonces muestro el link
		if (!isEmpty(id_je_vendorpayment))
			form.addPageLink('crosslink', 'GL Impact (Ganancias/SUSS/IVA/IIBB)', nlapiResolveURL('RECORD', 'journalentry', id_je_vendorpayment));
	}
}

function l54beforeSubmitVendorpayment(type) {
	nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorpayment', '3299 -  OPEN. type: '+type  +'Tiempo : ' + new Date());
	if (type == 'delete') {

		var id = nlapiGetRecordId();
		var type = nlapiGetRecordType();
		var record = nlapiLoadRecord(type, id);

		var jeAsociado = record.getFieldValue('custbody_l54_id_je_vendorpayment');
		var numLocalizado = record.getFieldValue('custbody_l54_numero_localizado');

		if (!isEmpty(jeAsociado)) {

			try {

				nlapiDeleteRecord('journalentry', jeAsociado);
				nlapiLogExecution('DEBUG', 'Se elimino el journalentry exitosamente.', 'Id del JE eliminado: ' + jeAsociado);
			} catch (e) {
				nlapiLogExecution('ERROR', 'Error eliminando el journalentry.', 'NetSuite error 3316: ' + e.message);
			}
		}

		// Elimino las Retenciones del Record de Retenciones
		var filtroRetenciones = new nlobjSearchFilter('custrecord_l54_ret_ref_pago_prov', null, 'is', id);
		var columnaRetenciones = new nlobjSearchColumn('internalid');

		var resultadoRetenciones = new nlapiSearchRecord('customrecord_l54_retencion', null, filtroRetenciones, columnaRetenciones);

		for (var i = 0; resultadoRetenciones != null && i < resultadoRetenciones.length; i++) {

			var idInternoRetencion = resultadoRetenciones[i].getValue('internalid');

			/*
			try {
			nlapiDeleteRecord('customrecord_l54_retencion', idInternoRetencion);
			} catch (e) {
			nlapiLogExecution('ERROR', 'Error Eliminando Retencion de Pago : ' + numLocalizado + ' - ID Interno Retencion : ' + idInternoRetencion , 'NetSuite error: ' + e.message);
			}*/

			// En vez de Eliminar la Retencion, la Marco como Eliminada

			if (!isEmpty(idInternoRetencion) && idInternoRetencion > 0) {
				try {

					var recordRetencion = nlapiLoadRecord('customrecord_l54_retencion', idInternoRetencion);
					var nombrePagoProveedor = recordRetencion.getFieldText('custrecord_l54_ret_ref_pago_prov');
					recordRetencion.setFieldValue('custrecord_l54_ret_eliminado', 'T');
					//recordRetencion.setFieldValue('custrecord_l54_ret_importe', 0.00);
					recordRetencion.setFieldValue('custrecord_l54_ret_ref_pago_eliminado', nombrePagoProveedor);

					var idRR = nlapiSubmitRecord(recordRetencion);

				} catch (e) {
					nlapiLogExecution('ERROR', 'Error Eliminando Retencion de Pago 3351 : ' + numLocalizado + ' - ID Interno Retencion : ' + idInternoRetencion, 'NetSuite error: ' + e.message);

				}

			}

		}
	}

	if (type == 'create') {

		var cal_ret_auto = nlapiGetFieldValue('custbody_l54_calcular_retenciones_auto');
		
		if (isEmpty(cal_ret_auto))
		{
			cal_ret_auto = 'F';
		}

		nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorpayment', 'cal_ret_auto: '+cal_ret_auto);

		/*Si se indica calcular las retenciones de forma automatica*/
		if (cal_ret_auto=='F')
		{
			// Genero el RecordType con la Informacion de las Retenciones
			cantidadRetenciones = nlapiGetLineItemCount('custpage_sublist_retenciones');

			var entity = nlapiGetFieldValue('entity');
			var id_posting_period = nlapiGetFieldValue('postingperiod');
			var tasa_cambio_pago = nlapiGetFieldValue('exchangerate');
			var moneda = nlapiGetFieldValue('currency');
			var fecha = nlapiGetFieldValue('trandate');
			var total = nlapiGetFieldValue('total');

			if (!isEmpty(total) && total > 0.00) {

				var idRetencionGanancias = new Array();
				var idRetencionSUSS = new Array();
				var idRetencionIVA = new Array();
				var idRetencionIIBB = new Array();

				var contadorGanancias = 0;
				var contadorSUSS = 0;
				var contadorIVA = 0;
				var contadorIIBB = 0;

				for (var i = 1; i <= cantidadRetenciones; i++) {

					var idTipoRetencion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_retencion', i);
					var idRetencion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_tipo_ret', i);
					var netoBillAplicados = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_net_bill', i);
					var baseCalculo = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo', i);
					var baseCalculoImp = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo_imp', i);
					var importeRetener = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_imp_a_retener', i);
					
					if(!isEmpty(importeRetener) && !isNaN(importeRetener) && parseFloat(importeRetener,10)>0){
					
						var condicion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_condicion', i);
						var jurisdiccion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_jurisdiccion', i);
						//var cuenta = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_cuenta', i);
						// Nuevo - ID de Tipo Contribuyente
						var idTipoContribuyente = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_id_tipo_contr', i);

						var alicuota = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_porcentaje', i);
						var idTipoExencion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_id_tipo_exen', i);
						var certificadoExencion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_cert_exen', i);
						var fechaExencion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_fecha_exen', i);
						//NUEVO - DATOS DE IMPORTES EARCIBA
						var diferenciaRedondeo = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_diferencia_redondeo', i);
						var importeRetencionOriginal = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_importe_ret_original', i);
						var baseCalculoRetOriginal = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo_original', i);
						var montoSujRetMonedaLocal = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_monto_suj_ret_mon_loc', i);

						var recordRetencion = nlapiCreateRecord('customrecord_l54_retencion');
						recordRetencion.setFieldValue('custrecord_l54_ret_cod_retencion', idRetencion);
						recordRetencion.setFieldValue('custrecord_l54_ret_jurisdiccion', jurisdiccion);
						//recordRetencion.setFieldValue('custrecord_l54_ret_cuenta', cuenta);

						recordRetencion.setFieldValue('custrecord_l54_ret_ref_pago_prov', nlapiGetRecordId());
						recordRetencion.setFieldValue('custrecord_l54_ret_importe', importeRetener);
						informacionRetencion = getInformacionRetencion(idRetencion);
						if (informacionRetencion != null) {
							recordRetencion.setFieldValue('custrecord_l54_ret_codigo_int', informacionRetencion.codigo);
							recordRetencion.setFieldValue('custrecord_l54_ret_tipo', informacionRetencion.tipo);
							recordRetencion.setFieldValue('custrecord_l54_ret_descrip_ret', informacionRetencion.descripcion);
						}
						recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo', baseCalculo);
						recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo_imp', baseCalculoImp);
						recordRetencion.setFieldValue('custrecord_l54_ret_ref_proveedor', entity);
						recordRetencion.setFieldValue('custrecord_l54_ret_anulado', 'F');
						recordRetencion.setFieldValue('custrecord_l54_ret_eliminado', 'F');
						recordRetencion.setFieldValue('custrecord_l54_ret_periodo', id_posting_period);
						recordRetencion.setFieldValue('custrecord_l54_ret_neto_bill_aplicado', netoBillAplicados);
						recordRetencion.setFieldValue('custrecord_l54_ret_tipo_cambio', tasa_cambio_pago);
						recordRetencion.setFieldValue('custrecord_l54_ret_moneda', moneda);
						recordRetencion.setFieldValue('custrecord_l54_ret_condicion', condicion);
						recordRetencion.setFieldValue('custrecord_l54_ret_fecha', fecha);
						recordRetencion.setFieldValue('custrecord_l54_ret_diferencia_redondeo', diferenciaRedondeo);
						recordRetencion.setFieldValue('custrecord_l54_ret_importe_ret_original', importeRetencionOriginal);
						recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo_original', baseCalculoRetOriginal);
						recordRetencion.setFieldValue('custrecord_l54_ret_monto_suj_ret_mon_loc', montoSujRetMonedaLocal);

						// Nuevo - Si el Tipo de Contribuyente es IIBB, grabo el Tipo de Contribuyente
						if (idTipoRetencion == 3 && !isEmpty(idTipoContribuyente)) {
							recordRetencion.setFieldValue('custrecord_l54_ret_tipo_contrib_iibb', idTipoContribuyente);
						}

						recordRetencion.setFieldValue('custrecord_l54_ret_alicuota', alicuota);
						recordRetencion.setFieldValue('custrecord_l54_ret_tipo_exencion', idTipoExencion);
						recordRetencion.setFieldValue('custrecord_l54_ret_cert_exencion', certificadoExencion);
						if (!isEmpty(fechaExencion)) {
							var fechaExencionDate = nlapiStringToDate(fechaExencion);
							if (!isEmpty(fechaExencionDate)) {
								var fechaExencionString = nlapiDateToString(fechaExencionDate, 'date');
								recordRetencion.setFieldValue('custrecord_l54_ret_fecha_exencion', fechaExencionString);
							}
						}

						try {
							var idRR = nlapiSubmitRecord(recordRetencion);
							if (idTipoRetencion == 1) {
								idRetencionGanancias[contadorGanancias] = idRR;
								contadorGanancias = parseInt(contadorGanancias, 10) + parseInt(1, 10);
							} else {
								if (idTipoRetencion == 2) {
									idRetencionIVA[contadorIVA] = idRR;
									contadorIVA = parseInt(contadorIVA, 10) + parseInt(1, 10);
								} else {
									if (idTipoRetencion == 3) {
										idRetencionIIBB[contadorIIBB] = idRR;
										contadorIIBB = parseInt(contadorIIBB, 10) + parseInt(1, 10);
									} else {
										idRetencionSUSS[contadorSUSS] = idRR;
										contadorSUSS = parseInt(contadorSUSS, 10) + parseInt(1, 10);
									}
								}
							}
						} catch (e) {
							nlapiLogExecution('ERROR', 'Error Grabando Retencion', 'NetSuite error  3473: ' + e.message);

						}
					
					}
				}

				if (idRetencionGanancias.length > 0)
					nlapiSetFieldValue('custbody_l54_id_ret_ganancias', idRetencionGanancias.toString());
				if (idRetencionIVA.length > 0)
					nlapiSetFieldValue('custbody_l54_id_ret_iva', idRetencionIVA.toString());
				if (idRetencionIIBB.length > 0)
					nlapiSetFieldValue('custbody_l54_id_ret_iibb', idRetencionIIBB.toString());
				if (idRetencionSUSS.length > 0)
					nlapiSetFieldValue('custbody_l54_id_ret_suss', idRetencionSUSS.toString());

			}

		}
		else
		{
			//Funcionalidad  l54pageInitVendorpayment - ANTES DE LA FUNCIÓN DE CARGA - INICIO
			//Esto se adaptó ya que la funcionalidad de pagos masivos crea los pagos de proveedor pero no se ejecutan los script de clientes implementados en este tipo de transacción.
			var letraStr = 'X';
			var letraId = getLetraId(letraStr);

			nlapiSetFieldValue('custbody_l54_boca', obtenerPuntoVenta());
			nlapiSetFieldValue('custbody_l54_letra', letraId);
			//Funcionalidad  l54pageInitVendorpayment - ANTES DE LA FUNCIÓN DE CARGA - FIN

			nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorpayment', 'letraId: '+letraId+'. PuntoVenta: '+obtenerPuntoVenta());

			// Obtengo Informaicon del Pago
			var entity = nlapiGetFieldValue('entity');
			var id_posting_period = nlapiGetFieldValue('postingperiod');
			var tasa_cambio_pago = nlapiGetFieldValue('exchangerate');
			var total = nlapiGetFieldValue('total');
			var trandate = nlapiGetFieldValue('trandate');
			var moneda = nlapiGetFieldValue('currency');
			var fecha = nlapiGetFieldValue('trandate');

			//nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorpayment', 'LINE: 3505. entity: '+entity+'. id_posting_period: '+id_posting_period+'. tasa_cambio_pago: '+tasa_cambio_pago+'. total: '+total+'. trandate: '+trandate+'. moneda: '+moneda+'. fecha: '+fecha);
			var subsidiariaPago = null;
			var esOneWorld = esOneworld();
			if (esOneWorld)
				subsidiariaPago = nlapiGetFieldValue('subsidiary');

			var informacionPago = new Object();	
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
				
				nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorpayment', '3552 - informacionPagoJson: '+informacionPagoJson + 'Tiempo: ' + new Date());

				try {
					var strURL   = nlapiResolveURL('SUITELET', 'customscript_l54_calc_retencion_compras', 'customdeploy_l54_calc_retencion_compras',true);
					var response = nlapiRequestURL(strURL, objInformacionPago, null, null);

					if (!isEmpty(response)) {
						var informacionRetenciones = JSON.parse(response.getBody());
						if (!isEmpty(informacionRetenciones)) {
							
							nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorpayment', 'informacionRetenciones: '+JSON.stringify(informacionRetenciones));

							if (informacionRetenciones.error == false) {

								var idTipoRetencion;
								var idRetencion;
								var netoBillAplicados;
								var baseCalculo;
								var baseCalculoImp;
								var importeRetener;
								var idRetencionGanancias = new Array();
								var idRetencionSUSS = new Array();
								var idRetencionIVA = new Array();
								var idRetencionIIBB = new Array();
								var contadorGanancias = 0;
								var contadorSUSS = 0;
								var contadorIVA = 0;
								var contadorIIBB = 0;
								var importeTotalGanancias = 0.00;
								var importeTotalSUSS = 0.00;
								var importeTotalIVA = 0.00;
								var importeTotalIIBB = 0.00;
								var condicion;
								var jurisdiccion;
								var idTipoContribuyente;
								var alicuota;
								var idTipoExencion;
								var certificadoExencion;
								var fechaExencion;

								if (informacionRetenciones.esAgenteRetencionGan) {

									if (informacionRetenciones.estaInscriptoRegimenGan) {

										for (var i = 0; informacionRetenciones.retencion_ganancias != null && i < informacionRetenciones.retencion_ganancias.length; i++){

											idTipoRetencion     = informacionRetenciones.retencion_ganancias[i].retencion;
											idRetencion         = informacionRetenciones.retencion_ganancias[i].tipo_ret;
											netoBillAplicados   = informacionRetenciones.retencion_ganancias[i].neto_bill;
											baseCalculo         = informacionRetenciones.retencion_ganancias[i].base_calculo;
											baseCalculoImp      = informacionRetenciones.retencion_ganancias[i].base_calculo_imp;
											importeRetener      = informacionRetenciones.retencion_ganancias[i].imp_retencion;
											condicion           = informacionRetenciones.retencion_ganancias[i].condicion;
											jurisdiccion        = '';
											idTipoContribuyente = '';
											var alicuotaRet     = parseFloat(informacionRetenciones.retencion_ganancias[i].alicuota,10);
											alicuota            = alicuotaRet;
											idTipoExencion      = '';
											certificadoExencion = '';
											fechaExencion       = '';
											var recordRetencion = nlapiCreateRecord('customrecord_l54_retencion');
											recordRetencion.setFieldValue('custrecord_l54_ret_cod_retencion', idRetencion);
											recordRetencion.setFieldValue('custrecord_l54_ret_jurisdiccion', jurisdiccion);
											recordRetencion.setFieldValue('custrecord_l54_ret_importe', importeRetener);
											informacionRetencion = getInformacionRetencion(idRetencion);
											if (informacionRetencion != null) {
												recordRetencion.setFieldValue('custrecord_l54_ret_codigo_int', informacionRetencion.codigo);
												recordRetencion.setFieldValue('custrecord_l54_ret_tipo', informacionRetencion.tipo);
												recordRetencion.setFieldValue('custrecord_l54_ret_descrip_ret', informacionRetencion.descripcion);
											}
											recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo', baseCalculo);
											recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo_imp', baseCalculoImp);
											recordRetencion.setFieldValue('custrecord_l54_ret_ref_proveedor', entity);
											recordRetencion.setFieldValue('custrecord_l54_ret_anulado', 'F');
											recordRetencion.setFieldValue('custrecord_l54_ret_eliminado', 'F');
											recordRetencion.setFieldValue('custrecord_l54_ret_periodo', id_posting_period);
											recordRetencion.setFieldValue('custrecord_l54_ret_neto_bill_aplicado', netoBillAplicados);
											recordRetencion.setFieldValue('custrecord_l54_ret_tipo_cambio', tasa_cambio_pago);
											recordRetencion.setFieldValue('custrecord_l54_ret_moneda', moneda);
											recordRetencion.setFieldValue('custrecord_l54_ret_condicion', condicion);
											recordRetencion.setFieldValue('custrecord_l54_ret_fecha', fecha);
											recordRetencion.setFieldValue('custrecord_l54_ret_alicuota', alicuota);
											recordRetencion.setFieldValue('custrecord_l54_ret_tipo_exencion', idTipoExencion);
											recordRetencion.setFieldValue('custrecord_l54_ret_cert_exencion', certificadoExencion);

											importeTotalGanancias = parseFloat(importeTotalGanancias, 10) + parseFloat(importeRetener, 10);

											try {
												var idRR = nlapiSubmitRecord(recordRetencion);

												idRetencionGanancias[contadorGanancias] = idRR;
												contadorGanancias = parseInt(contadorGanancias, 10) + parseInt(1, 10);
											} catch (e) {
												nlapiLogExecution('ERROR', 'l54beforeSubmitVendorpayment', 'NetSuite error - 3644 : ' + e.message);
											}
												
										}

										if (idRetencionGanancias.length > 0)
											nlapiSetFieldValue('custbody_l54_id_ret_ganancias', idRetencionGanancias.toString());
											nlapiSetFieldValue('custbody_l54_gan_imp_a_retener', importeTotalGanancias);
									}
								}


								if (informacionRetenciones.esAgenteRetencionIVA) {

									if (informacionRetenciones.estaInscriptoRegimenIVA) {

										for (var i = 0; informacionRetenciones.retencion_iva != null && i < informacionRetenciones.retencion_iva.length; i++){
											idTipoRetencion     = informacionRetenciones.retencion_iva[i].retencion;
											idRetencion         = informacionRetenciones.retencion_iva[i].tipo_ret;
											netoBillAplicados   = informacionRetenciones.retencion_iva[i].neto_bill;
											baseCalculo         = informacionRetenciones.retencion_iva[i].base_calculo;
											baseCalculoImp      = informacionRetenciones.retencion_iva[i].base_calculo_imp;
											importeRetener      = informacionRetenciones.retencion_iva[i].imp_retencion;
											condicion           = informacionRetenciones.retencion_iva[i].condicion;
											jurisdiccion        = '';
											idTipoContribuyente = '';
											var alicuotaRet     = parseFloat(informacionRetenciones.retencion_iva[i].alicuota,10);
											alicuota            = alicuotaRet;
											idTipoExencion      = '';
											certificadoExencion = '';
											fechaExencion       = '';
											var recordRetencion = nlapiCreateRecord('customrecord_l54_retencion');
											recordRetencion.setFieldValue('custrecord_l54_ret_cod_retencion', idRetencion);
											recordRetencion.setFieldValue('custrecord_l54_ret_jurisdiccion', jurisdiccion);
											recordRetencion.setFieldValue('custrecord_l54_ret_importe', importeRetener);
											informacionRetencion = getInformacionRetencion(idRetencion);
											if (informacionRetencion != null) {
												recordRetencion.setFieldValue('custrecord_l54_ret_codigo_int', informacionRetencion.codigo);
												recordRetencion.setFieldValue('custrecord_l54_ret_tipo', informacionRetencion.tipo);
												recordRetencion.setFieldValue('custrecord_l54_ret_descrip_ret', informacionRetencion.descripcion);
											}
											recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo', baseCalculo);
											recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo_imp', baseCalculoImp);
											recordRetencion.setFieldValue('custrecord_l54_ret_ref_proveedor', entity);
											recordRetencion.setFieldValue('custrecord_l54_ret_anulado', 'F');
											recordRetencion.setFieldValue('custrecord_l54_ret_eliminado', 'F');
											recordRetencion.setFieldValue('custrecord_l54_ret_periodo', id_posting_period);
											recordRetencion.setFieldValue('custrecord_l54_ret_neto_bill_aplicado', netoBillAplicados);
											recordRetencion.setFieldValue('custrecord_l54_ret_tipo_cambio', tasa_cambio_pago);
											recordRetencion.setFieldValue('custrecord_l54_ret_moneda', moneda);
											recordRetencion.setFieldValue('custrecord_l54_ret_condicion', condicion);
											recordRetencion.setFieldValue('custrecord_l54_ret_fecha', fecha);
											recordRetencion.setFieldValue('custrecord_l54_ret_alicuota', alicuota);
											recordRetencion.setFieldValue('custrecord_l54_ret_tipo_exencion', idTipoExencion);
											recordRetencion.setFieldValue('custrecord_l54_ret_cert_exencion', certificadoExencion);
											importeTotalIVA = parseFloat(importeTotalIVA, 10) + parseFloat(importeRetener, 10);

											try {
												var idRR = nlapiSubmitRecord(recordRetencion);

												idRetencionIVA[contadorIVA] = idRR;
												contadorIVA = parseInt(contadorIVA, 10) + parseInt(1, 10);

											} catch (e) {
												nlapiLogExecution('ERROR', 'l54beforeSubmitVendorpayment-l54callBackRetenciones', 'LINE: 3708. NetSuite error: ' + e.message);
											}
												
										}

										if (idRetencionIVA.length > 0)
											nlapiSetFieldValue('custbody_l54_id_ret_iva', idRetencionIVA.toString());

										nlapiSetFieldValue('custbody_l54_iva_imp_a_retener', importeTotalIVA);
									}
								}


								if (informacionRetenciones.esAgenteRetencionIIBB) {

									if (informacionRetenciones.estaInscriptoRegimenIIBB) {

										for (var i = 0; informacionRetenciones.retencion_iibb != null && i < informacionRetenciones.retencion_iibb.length; i++){
											idTipoRetencion     = informacionRetenciones.retencion_iibb[i].retencion;
											idRetencion         = informacionRetenciones.retencion_iibb[i].tipo_ret;
											netoBillAplicados   = informacionRetenciones.retencion_iibb[i].neto_bill;
											baseCalculo         = informacionRetenciones.retencion_iibb[i].base_calculo;
											baseCalculoImp      = informacionRetenciones.retencion_iibb[i].base_calculo_imp;
											importeRetener      = informacionRetenciones.retencion_iibb[i].imp_retencion;
											condicion           = informacionRetenciones.retencion_iibb[i].condicion;
											jurisdiccion        = informacionRetenciones.retencion_iibb[i].jurisdiccion;
											idTipoContribuyente = informacionRetenciones.retencion_iibb[i].condicionID;
											var alicuotaRet     = parseFloat(informacionRetenciones.retencion_iibb[i].alicuota,10);
											alicuota            = alicuotaRet;
											idTipoExencion      = informacionRetenciones.retencion_iibb[i].tipoExencion;
											certificadoExencion = informacionRetenciones.retencion_iibb[i].certExencion;
											fechaExencion       = informacionRetenciones.retencion_iibb[i].fcaducidadExencion;
											var diferenciaRedondeo   = informacionRetenciones.retencion_iibb[i].diferenciaRedondeo;
                                            var importeRetOriginal   = informacionRetenciones.retencion_iibb[i].imp_retencion_original;
											var baseCalculoOriginal  = informacionRetenciones.retencion_iibb[i].base_calculo_original;
											var montoSujRetMonedaLocal = informacionRetenciones.retencion_iibb[i].monto_suj_ret_moneda_local;
											var recordRetencion = nlapiCreateRecord('customrecord_l54_retencion');
											recordRetencion.setFieldValue('custrecord_l54_ret_cod_retencion', idRetencion);
											recordRetencion.setFieldValue('custrecord_l54_ret_jurisdiccion', jurisdiccion);
											recordRetencion.setFieldValue('custrecord_l54_ret_importe', importeRetener);
											recordRetencion.setFieldValue('custrecord_l54_ret_importe_ret_original', importeRetOriginal);
											recordRetencion.setFieldValue('custrecord_l54_ret_diferencia_redondeo', diferenciaRedondeo);
											informacionRetencion = getInformacionRetencion(idRetencion);
											if (informacionRetencion != null) {
												recordRetencion.setFieldValue('custrecord_l54_ret_codigo_int', informacionRetencion.codigo);
												recordRetencion.setFieldValue('custrecord_l54_ret_tipo', informacionRetencion.tipo);
												recordRetencion.setFieldValue('custrecord_l54_ret_descrip_ret', informacionRetencion.descripcion);
											}
											recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo', baseCalculo);
											recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo_original', baseCalculoOriginal);
											recordRetencion.setFieldValue('custrecord_l54_ret_monto_suj_ret_mon_loc', montoSujRetMonedaLocal);
											recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo_imp', baseCalculoImp);
											recordRetencion.setFieldValue('custrecord_l54_ret_ref_proveedor', entity);
											recordRetencion.setFieldValue('custrecord_l54_ret_anulado', 'F');
											recordRetencion.setFieldValue('custrecord_l54_ret_eliminado', 'F');
											recordRetencion.setFieldValue('custrecord_l54_ret_periodo', id_posting_period);
											recordRetencion.setFieldValue('custrecord_l54_ret_neto_bill_aplicado', netoBillAplicados);
											recordRetencion.setFieldValue('custrecord_l54_ret_tipo_cambio', tasa_cambio_pago);
											recordRetencion.setFieldValue('custrecord_l54_ret_moneda', moneda);
											recordRetencion.setFieldValue('custrecord_l54_ret_condicion', condicion);
											recordRetencion.setFieldValue('custrecord_l54_ret_fecha', fecha);

											// Nuevo - Si el Tipo de Contribuyente es IIBB, grabo el Tipo de Contribuyente
											if (idTipoRetencion == 3 && !isEmpty(idTipoContribuyente)) {
												recordRetencion.setFieldValue('custrecord_l54_ret_tipo_contrib_iibb', idTipoContribuyente);
											}

											recordRetencion.setFieldValue('custrecord_l54_ret_alicuota', alicuota);
											recordRetencion.setFieldValue('custrecord_l54_ret_tipo_exencion', idTipoExencion);
											recordRetencion.setFieldValue('custrecord_l54_ret_cert_exencion', certificadoExencion);

											if (!isEmpty(fechaExencion)) {
												var fechaExencionDate = nlapiStringToDate(fechaExencion);
												if (!isEmpty(fechaExencionDate)) {
													var fechaExencionString = nlapiDateToString(fechaExencionDate, 'date');
													recordRetencion.setFieldValue('custrecord_l54_ret_fecha_exencion', fechaExencionString);
												}
											}

											importeTotalIIBB = parseFloat(importeTotalIIBB, 10) + parseFloat(importeRetener, 10);

											try {
												var idRR = nlapiSubmitRecord(recordRetencion);

												idRetencionIIBB[contadorIIBB] = idRR;
												contadorIIBB = parseInt(contadorIIBB, 10) + parseInt(1, 10);

											} catch (e) {
												nlapiLogExecution('ERROR', 'l54beforeSubmitVendorpayment-l54callBackRetenciones', 'LINE: 3812. NetSuite error: ' + e.message);
											}
												
										}

										if (idRetencionIIBB.length > 0)
											nlapiSetFieldValue('custbody_l54_id_ret_iibb', idRetencionIIBB.toString());
											nlapiSetFieldValue('custbody_l54_iibb_imp_a_retener', importeTotalIIBB);
									}
								}


								if (informacionRetenciones.esAgenteRetencionSUSS) {

									if (informacionRetenciones.estaInscriptoRegimenSUSS) {

										for (var i = 0; informacionRetenciones.retencion_suss != null && i < informacionRetenciones.retencion_suss.length; i++){

											idTipoRetencion     = informacionRetenciones.retencion_suss[i].retencion;
											idRetencion         = informacionRetenciones.retencion_suss[i].tipo_ret;
											netoBillAplicados   = informacionRetenciones.retencion_suss[i].neto_bill;
											baseCalculo         = informacionRetenciones.retencion_suss[i].base_calculo;
											baseCalculoImp      = informacionRetenciones.retencion_suss[i].base_calculo_imp;
											importeRetener      = informacionRetenciones.retencion_suss[i].imp_retencion;
											condicion           = informacionRetenciones.retencion_suss[i].condicion;
											jurisdiccion        = '';
											idTipoContribuyente = '';
											var alicuotaRet     = parseFloat(informacionRetenciones.retencion_suss[i].alicuota,10);
											alicuota            = alicuotaRet;
											idTipoExencion      = '';
											certificadoExencion = '';
											fechaExencion       = '';
											var recordRetencion = nlapiCreateRecord('customrecord_l54_retencion');
											recordRetencion.setFieldValue('custrecord_l54_ret_cod_retencion', idRetencion);
											recordRetencion.setFieldValue('custrecord_l54_ret_jurisdiccion', jurisdiccion);
											recordRetencion.setFieldValue('custrecord_l54_ret_importe', importeRetener);
											informacionRetencion = getInformacionRetencion(idRetencion);
											if (informacionRetencion != null) {
												recordRetencion.setFieldValue('custrecord_l54_ret_codigo_int', informacionRetencion.codigo);
												recordRetencion.setFieldValue('custrecord_l54_ret_tipo', informacionRetencion.tipo);
												recordRetencion.setFieldValue('custrecord_l54_ret_descrip_ret', informacionRetencion.descripcion);
											}
											recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo', baseCalculo);
											recordRetencion.setFieldValue('custrecord_l54_ret_base_calculo_imp', baseCalculoImp);
											recordRetencion.setFieldValue('custrecord_l54_ret_ref_proveedor', entity);
											recordRetencion.setFieldValue('custrecord_l54_ret_anulado', 'F');
											recordRetencion.setFieldValue('custrecord_l54_ret_eliminado', 'F');
											recordRetencion.setFieldValue('custrecord_l54_ret_periodo', id_posting_period);
											recordRetencion.setFieldValue('custrecord_l54_ret_neto_bill_aplicado', netoBillAplicados);
											recordRetencion.setFieldValue('custrecord_l54_ret_tipo_cambio', tasa_cambio_pago);
											recordRetencion.setFieldValue('custrecord_l54_ret_moneda', moneda);
											recordRetencion.setFieldValue('custrecord_l54_ret_condicion', condicion);
											recordRetencion.setFieldValue('custrecord_l54_ret_fecha', fecha);
											recordRetencion.setFieldValue('custrecord_l54_ret_alicuota', alicuota);
											recordRetencion.setFieldValue('custrecord_l54_ret_tipo_exencion', idTipoExencion);
											recordRetencion.setFieldValue('custrecord_l54_ret_cert_exencion', certificadoExencion);

											if (idTipoRetencion == 4) {
												importeTotalSUSS = parseFloat(importeTotalSUSS, 10) + parseFloat(importeRetener, 10);
											}

											try {
												var idRR = nlapiSubmitRecord(recordRetencion);
												
												idRetencionSUSS[contadorSUSS] = idRR;
												contadorSUSS = parseInt(contadorSUSS, 10) + parseInt(1, 10);

											} catch (e) {
												nlapiLogExecution('ERROR', 'l54beforeSubmitVendorpayment', 'NetSuite error 3856: ' + e.message);
											}
										}

										if (idRetencionSUSS.length > 0)
											nlapiSetFieldValue('custbody_l54_id_ret_suss', idRetencionSUSS.toString());

										nlapiSetFieldValue('custbody_l54_suss_imp_a_retener', importeTotalSUSS);
									}
								}


								if (!isEmpty(informacionRetenciones.importe_neto_a_abonar))
									nlapiSetFieldValue('custbody_l54_importe_neto_a_abonar', informacionRetenciones.importe_neto_a_abonar, false);

								if (!isEmpty(informacionRetenciones.neto_bill_aplicados))
									nlapiSetFieldValue('custbody_l54_neto_bill_aplicados', informacionRetenciones.neto_bill_aplicados, false);

								if (!isEmpty(informacionRetenciones.importe_total_retencion))
									nlapiSetFieldValue('custbody_l54_importe_total_retencion', informacionRetenciones.importe_total_retencion, false);

								if (!isEmpty(informacionRetenciones.importe_iva))
									nlapiSetFieldValue('custbody_l54_importe_iva', informacionRetenciones.importe_iva, false);

								if (!isEmpty(informacionRetenciones.importe_percepciones))
									nlapiSetFieldValue('custbody_l54_importe_percepciones', informacionRetenciones.importe_percepciones, false);

								if (!isEmpty(informacionRetenciones.version_calc_ret))
									nlapiSetFieldValue('custbody_l54_version_calc_ret', informacionRetenciones.version_calc_ret, false);

								var importeTotalRetencion = parseFloat(importeTotalGanancias, 10) + parseFloat(importeTotalIVA, 10) + parseFloat(importeTotalIIBB, 10) + parseFloat(importeTotalSUSS, 10);

							}else {
									// Muestro el Error
									var erroresCalculoRetenciones = "";
									if (informacionRetenciones.mensajeError != null && i < informacionRetenciones.mensajeError.length == 1) {
										erroresCalculoRetenciones = informacionRetenciones.mensajeError[0];
									} else {
										for (var i = 0; informacionRetenciones.mensajeError != null && i < informacionRetenciones.mensajeError.length; i++) {
											erroresCalculoRetenciones += informacionRetenciones.mensajeError[i] + " / ";
										}
									}
									nlapiLogExecution('ERROR', 'l54beforeSubmitVendorpayment', erroresCalculoRetenciones);
							}
						}else {
							nlapiLogExecution('ERROR', 'l54beforeSubmitVendorpayment', 'Error Obteniendo Informacion de Cálculo de Retenciones');
						}

					}else
					{
						nlapiLogExecution('ERROR', 'l54beforeSubmitVendorpayment', 'Error Obteniendo Informacion de Cálculo de Retenciones');
					}
				}
				catch(e)
				{
					nlapiLogExecution('ERROR', 'l54beforeSubmitVendorpayment', '3912 - Error: '+e.message + 'Tiempo : ' + new Date());
					nlapiSetFieldValue('custbody_l54_proc_ret','T')

				}


				try{
					//Funcionalidad l54saveVendorpayment - GUARDAR FUNCIÓN DE REGISTRO - INICIO
					//Esto se adaptó ya que la funcionalidad de pagos masivos crea los pagos de proveedor pero no se ejecutan los script de clientes implementados en este tipo de transacción.
					var contadorFacturas = 0;
					var billsPagarAux    = new Array();
					var billsPagar       = new Array();
					var tasa_cambio_pago = nlapiGetFieldValue('exchangerate');
					var entity           = nlapiGetFieldValue('entity');
					var total            = nlapiGetFieldValue('total');
					var moneda           = nlapiGetFieldValue('currency');			

					var subsidiariaPago = null;
					var esOneWorld = esOneworld();
					if (esOneWorld)
						subsidiariaPago = nlapiGetFieldValue('subsidiary');

					if(!isEmpty(total) && total>0.00){
						if (!isEmpty(entity)) {

							for (var j = 1; j <= nlapiGetLineItemCount('apply'); j++) {
								if (nlapiGetLineItemValue('apply', 'apply', j) == "T") {
									var id_vendorbill = nlapiGetLineItemValue('apply', 'doc', j);
									//if(nlapiLookupField('transaction', id_vendorbill, 'recordtype')!="expensereport"){
										billsPagar[contadorFacturas] = new Object();
										billsPagar[contadorFacturas].idVendorBill = id_vendorbill;
										billsPagar[contadorFacturas].linea = j;
										billsPagarAux[contadorFacturas] = id_vendorbill;
										contadorFacturas = parseInt(contadorFacturas, 10) + parseInt(1, 10);
									//}
								}
							}

							if (billsPagarAux != null && billsPagarAux.length > 0) {
								
								var resultsCodigosRetVB = obtener_arreglo_codigos_ret_vendorbill(entity, billsPagarAux, subsidiariaPago);

								var resultsNetosVB = obtener_arreglo_netos_vendorbill(entity, billsPagarAux, subsidiariaPago);

								var importe_neto_factura_proveedor_a_pagar_total = 0.0;

								for (var i = 1; i <= billsPagar.length; i++) {

									// Obtengo el identificador de la factura de proveedor aplicada
									var id_vendorbill = billsPagar[i - 1].idVendorBill;

									var importe_bruto_factura_proveedor = 0.0;
									var importe_bruto_factura_proveedor_a_pagar = 0.0;
									var importe_neto_factura_proveedor_a_pagar = 0.0;
									var importe_neto_factura_proveedor = obtener_neto_vendorbill(resultsNetosVB, id_vendorbill);

									//var recordVendorBill = nlapiLoadRecord(nlapiLookupField('transaction', id_vendorbill, 'recordtype'), id_vendorbill);

									//importe_bruto_factura_proveedor = recordVendorBill.getFieldValue('total');
									/*SU-1*/
									var objCodigos = obtener_codigos_vendorbill(resultsCodigosRetVB, id_vendorbill);
									
									if(objCodigos!=null && !isEmpty(objCodigos.importeTotal) && !isNaN(objCodigos.importeTotal)){
										importe_bruto_factura_proveedor=parseFloat(objCodigos.importeTotal,10);
									}
									/*SU-1*/

									// obtengo el importe pagado realmente de la factura para sacar su porcentaje sobre el total
									importe_bruto_factura_proveedor_a_pagar = parseFloat(nlapiGetLineItemValue('apply', 'amount', billsPagar[i - 1].linea));
									coeficiente = parseFloat(importe_bruto_factura_proveedor) / importe_neto_factura_proveedor;
									importe_neto_factura_proveedor_a_pagar = importe_bruto_factura_proveedor_a_pagar / coeficiente;
									// Lo paso a la Moneda Base
									importe_neto_factura_proveedor_a_pagar = parseFloat(parseFloat(importe_neto_factura_proveedor_a_pagar, 10) * parseFloat(tasa_cambio_pago, 10), 10).toFixed(2);

									importe_neto_factura_proveedor_a_pagar_total = parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10) + parseFloat(importe_neto_factura_proveedor_a_pagar, 10);
								}
								// FIN NUEVO 2015
								if(parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10)!=0.00){
									nlapiSetFieldValue('custbody_l54_neto_bill_aplicados', parseFloat(parseFloat(importe_neto_factura_proveedor_a_pagar_total, 10) / parseFloat(tasa_cambio_pago, 10), 10).toFixed(2), false);
								}
							}
						}
						
						var esND         = nlapiGetFieldValue('custbody_l54_nd');
						var tipoTransStr = 'vendorpayment';
						var recId        = nlapiGetRecordId();

						if (esOneworld())
							var subsidiaria = nlapiGetFieldValue('subsidiary');
						else
							var subsidiaria = null;

						var tipoTransId = numeradorAUtilizar(getTipoTransId(tipoTransStr), esND, subsidiaria);
						var bocaId = nlapiGetFieldValue("custbody_l54_boca");
						var letraId = nlapiGetFieldValue("custbody_l54_letra");
						var esLiquidoProducto = nlapiGetFieldValue("custbody_l54_liquido_producto");
						var esCreditoElectronico = nlapiGetFieldValue("custbody_l54_es_credito_electronico");
						if (isEmpty(esLiquidoProducto)) {
							esLiquidoProducto = 'F';
						}
						if (isEmpty(esCreditoElectronico)) {
							esCreditoElectronico = 'F';
						}
						nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorpayment', 'esLiquidoProducto: ' + esLiquidoProducto+' - esCreditoElectronico: '+esCreditoElectronico);

						if (validarNumerador(tipoTransId, bocaId, letraId, esLiquidoProducto, esCreditoElectronico) == false)
							return false;

						// valido que si el numerador esta en Manual se cargue el nro. de factura
						if (nlapiGetFieldValue('custbody_l54_numerador_manual') == 'T') {
							if (isEmpty(nlapiGetFieldValue('custbody_l54_numero'))) {
								//alert("La transacción se encuentra en Numerador Manual, por lo tanto debe ingresar un Numerador. Verifique.");
								nlapiLogExecution('ERROR', 'l54beforeSubmitVendorpayment', 'La transacción se encuentra en Numerador Manual, por lo tanto debe ingresar un Numerador. Verifique.');
								return false;
							}

							var numeroLocalizado = nlapiGetFieldValue('custbody_l54_numero_localizado');

							if (existenciaTransaccion(tipoTransId, recId, numeroLocalizado)) {
								//alert("Existe una transacción de este tipo en el Sistema con igual Numerador (Nro. " + numeroLocalizado + ") Verifique.");
								nlapiLogExecution('ERROR', 'l54beforeSubmitVendorpayment', "Existe una transacción de este tipo en el Sistema con igual Numerador (Nro. " + numeroLocalizado + ") Verifique.");
								return false;
							}
						}

						var netoBillAplicadoAUX = nlapiGetFieldValue('custbody_l54_neto_bill_aplicados');
						var netoAbonarAUX       = nlapiGetFieldValue('custbody_l54_importe_neto_a_abonar');

					}
					else{
						nlapiSetFieldValue('custbody_l54_neto_bill_aplicados', 0.00, false);
					}
				}
				catch(e)
				{
					nlapiLogExecution('ERROR', ' l54beforeSubmitVendorpayment', 'Error 4035:  '+e.message + 'Tiempo: ' + new Date());
					nlapiSetFieldValue('custbody_l54_proc_ret','T')
				}
			}
		}
	}


	if (type == 'edit') {

		var idPagoProveedor = nlapiGetRecordId();

		// Actualizo los Importes de las Retenciones

		cantidadRetenciones = nlapiGetLineItemCount('custpage_sublist_retenciones');

		for (var i = 1; i <= cantidadRetenciones; i++) {

			var idTipoRetencion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_retencion', i);
			var idRetencion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_tipo_ret', i);
			var netoBillAplicados = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_net_bill', i);
			var baseCalculo = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo', i);
			var baseCalculoImp = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_base_calculo_imp', i);
			var importeRetener = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_imp_a_retener', i);
			var jurisdiccion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_jurisdiccion', i);
			//var cuenta = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_cuenta', i);
			// Nuevo - ID de Tipo Contribuyente
			var idTipoContribuyente = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_id_tipo_contr', i);

			var alicuota = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_porcentaje', i);
			var idTipoExencion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_id_tipo_exen', i);
			var certificadoExencion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_cert_exen', i);
			var fechaExencion = nlapiGetLineItemValue('custpage_sublist_retenciones', 'custrecord_l54_ret_fecha_exen', i);

			if (!isEmpty(idTipoRetencion) && !isEmpty(idRetencion) && !isEmpty(idPagoProveedor)) {
				// busco la retencion y la Actualizo
				var filtroRetencion = new Array();
				filtroRetencion[0] = new nlobjSearchFilter('custrecord_l54_ret_tipo', null, 'is', idTipoRetencion);
				filtroRetencion[1] = new nlobjSearchFilter('custrecord_l54_ret_cod_retencion', null, 'is', idRetencion);
				filtroRetencion[2] = new nlobjSearchFilter('custrecord_l54_ret_ref_pago_prov', null, 'is', idPagoProveedor);
				filtroRetencion[3] = new nlobjSearchFilter('custrecord_l54_ret_anulado', null, 'is', 'F');
				filtroRetencion[4] = new nlobjSearchFilter('custrecord_l54_ret_eliminado', null, 'is', 'F');
				if (!isEmpty(jurisdiccion)) {
					filtroRetencion[5] = new nlobjSearchFilter('custrecord_l54_ret_jurisdiccion', null, 'is', jurisdiccion);
				}

				var columnaRetencion = new nlobjSearchColumn('internalid');

				var resultadoRetencion = new nlapiSearchRecord('customrecord_l54_retencion', null, filtroRetencion, columnaRetencion);

				if (!isEmpty(resultadoRetencion) && resultadoRetencion.length > 0) {

					var idRetencion = resultadoRetencion[0].getValue('internalid');

					if (!isEmpty(idRetencion) && idRetencion > 0) {

						var recordRetencion = nlapiLoadRecord('customrecord_l54_retencion', idRetencion);
						recordRetencion.setFieldValue('custrecord_l54_ret_importe', importeRetener);
						recordRetencion.setFieldValue('custrecord_54_ret_base_calculo', baseCalculo);
						recordRetencion.setFieldValue('custrecord_54_ret_base_calculo_imp', baseCalculoImp);
						recordRetencion.setFieldValue('custrecord_l54_ret_neto_bill_aplicado', netoBillAplicados);
						recordRetencion.setFieldValue('custrecord_l54_ret_jurisdiccion', jurisdiccion);
						//recordRetencion.setFieldValue('custrecord_l54_ret_cuenta', cuenta);
						// Nuevo - Si el Tipo de Contribuyente es IIBB, grabo el Tipo de Contribuyente
						if (idTipoRetencion == 3 && !isEmpty(idTipoContribuyente)) {
							recordRetencion.setFieldValue('custrecord_l54_ret_tipo_contrib_iibb', idTipoContribuyente);
						}

						recordRetencion.setFieldValue('custrecord_l54_ret_alicuota', alicuota);
						recordRetencion.setFieldValue('custrecord_l54_ret_tipo_exencion', idTipoExencion);
						recordRetencion.setFieldValue('custrecord_l54_ret_cert_exencion', certificadoExencion);
						if (!isEmpty(fechaExencion)) {
							var fechaExencionDate = nlapiStringToDate(fechaExencion);
							if (!isEmpty(fechaExencionDate)) {
								var fechaExencionString = nlapiDateToString(fechaExencionDate, 'date');
								recordRetencion.setFieldValue('custrecord_l54_ret_fecha_exencion', fechaExencionString);
							}
						}

						try {
							var idRR = nlapiSubmitRecord(recordRetencion);
						} catch (e) {
							nlapiLogExecution('ERROR', 'Error Actualizando Retencion', 'NetSuite error: ' + e.message);
						}

					}

				}
				/*else{
				// DEberia Crear la Retencion si no la Encontre, por si se modifico el codigo de Retencion en la Factura , no porque en el Edit no puede modificar las
				Retenciones que ya tiene, solo los importes, con lo cual si a una retencion le asigna importe 0.00 quizas deberia eliminarla o no porque quedaria en 0.00 y
				En el diario no iria.
				}*/
			}

		}

	}

}

function l54afterSubmitVendorpayment(type) {
	nlapiLogExecution('DEBUG', 'l54afterSubmitVendorpayment', 'OPEN. type: '+type);
	var objRta = new Object();
	objRta.error = false;
	objRta.warning = false;
	objRta.mensajeError = new Array();
	objRta.mensajeWarning = new Array();
	objRta.mensajeOk = "";

	//Invoco a la funciÃ³n:
	var recId = nlapiGetRecordId();
	var recType = nlapiGetRecordType();

	// Cuando el pago es de 0.00 no se guarda el pago
	if (!isEmpty(recId) && !isEmpty(recType) && recId > 0) {
		procesaVendorPayment(type, recType, recId, objRta);
	}
}

/*procesaVendorPayment_suitelet
Suitelet que ejecuta la misma funciÃ³n que el after submit. Es para invocarlo desde pago masivo
EJECUTA ACCIONES
 */
function procesaVendorPayment_suitelet(request, response) {
	var objRta = new Object();
	objRta.error = false;
	objRta.warning = false;
	objRta.mensajeError = new Array();
	objRta.mensajeWarning = new Array();
	objRta.mensajeOk = "";
	objRta.nro_asiento = '';

	try {
		var type = request.getParameter('type');
		var recId = request.getParameter('recId');
		var recType = request.getParameter('recType');
		var infoRetIIBB = JSON.parse(request.getParameter('infoRetIIBB'));

		if (isEmpty(type)) {
			objRta.mensajeError = 'type es mandatorio';
			objRta.error = true;
		}

		if (isEmpty(recId) || (!isEmpty(recId) && recId == 0)) {
			objRta.mensajeError = 'recId es mandatorio';
			objRta.error = true;
		}

		if (isEmpty(recType)) {
			objRta.mensajeError = 'recType es mandatorio';
			objRta.error = true;
		}

		if (!objRta.error)
			procesaVendorPayment(type, recType, recId, objRta, infoRetIIBB);
	} catch (err) {
		objRta.error = true;
		objRta.mensajeError = err.message;
	}

	response.setContentType('JSON');
	response.writeLine(JSON.stringify(objRta));
}

/*
procesaVendorPayment:
====================
Inicialmente era el script after submit, pero por pagos masivos se encapsula en funciÃ³n.
infoRetIIBB: Solo pago masivo
 */

function procesaVendorPayment(type, recType, recId, objRta, infoRetIIBB) {
	try {
		nlapiLogExecution('DEBUG', 'procesaVendorPayment', 'type:' + type + ',recType:' + recType + ',recId:' + recId + ',objRta:' + JSON.stringify(objRta) + ',infoRetIIBB:' + JSON.stringify(infoRetIIBB));

		var registroCargado = false;
		if (type == 'create' || type == 'edit' || type == 'paybills') {
			//var recId = nlapiGetRecordId();
			//var recType = nlapiGetRecordType();
			if (!isEmpty(recId)) {

				try {
					var record     = nlapiLoadRecord(recType, recId);
					var recVoided  = record.getFieldValue('voided');
					var recStatus  = record.getFieldValue('status');
					var codigo_op  = record.getFieldValue('custbody_l54_numero_localizado');
					var entity     = record.getFieldValue('entity');
					var trandate   = record.getFieldValue('trandate');
					var subsidiary = null;
					var esOneWorld = esOneworld();
					if (esOneWorld) {
						subsidiary = record.getFieldValue('subsidiary');
					}
					var cal_ret_auto = record.getFieldValue('custbody_l54_calcular_retenciones_auto');
					if (isEmpty(cal_ret_auto))
					{
						cal_ret_auto = 'F';
					}
					var esND = record.getFieldValue('custbody_l54_nd');
					var tasa_pago = record.getFieldValue('exchangerate');

					var numerador_manual = record.getFieldValue('custbody_l54_numerador_manual');
					var bocaId = record.getFieldValue("custbody_l54_boca");
					var letraId = record.getFieldValue("custbody_l54_letra");
					var esLiquidoProducto = record.getFieldValue("custbody_l54_liquido_producto");
					var esCreditoElectronico = record.getFieldValue("custbody_l54_es_credito_electronico");
					if (isEmpty(esLiquidoProducto)) {
						esLiquidoProducto = 'F';
					}
					if (isEmpty(esCreditoElectronico)) {
						esCreditoElectronico = 'F';
					}
					nlapiLogExecution('DEBUG', 'procesaVendorPayment', 'esLiquidoProducto: ' + esLiquidoProducto+' - esCreditoElectronico: '+esCreditoElectronico);

					var tipoTransStr = 'vendorpayment';

					var esPagoMasivo = record.getFieldValue('custbody_l54_es_pago_masivo');

					var subsidiariaPago = null;
					var subsidiaria = null;

					var esOneWorld = esOneworld();
					if (esOneWorld) {
						subsidiariaPago = subsidiary;
						subsidiaria = subsidiary;
					}

					// Defino identificadores para las cuentas contables
					var id_account = record.getFieldValue('account'); // cuenta contable original del pago
					var id_ret_ganancias = getCuentaContableId('gan', subsidiariaPago); // cuenta contable ganancias
					var id_ret_suss = getCuentaContableId('suss', subsidiariaPago); // cuenta contable SUSS
					var id_ret_iva = getCuentaContableId('iva', subsidiariaPago); // cuenta contable IVA
					//var id_ret_iibb	= getCuentaContableId('iibb',subsidiariaPago); // cuenta contable IIBB

					var idsRetGanancia = record.getFieldValue("custbody_l54_id_ret_ganancias");
					var idsRetIVA = record.getFieldValue("custbody_l54_id_ret_iva");
					var idsRetIIBB = record.getFieldValue("custbody_l54_id_ret_iibb");
					var idsRetSUSS = record.getFieldValue("custbody_l54_id_ret_suss");

					// FIX 04/06/2014
					registroCargado = true;
				} catch (e) {
					nlapiLogExecution('ERROR', 'Error leyendo vendorpayment.', 'NetSuite error: ' + e.message);
					// FIX 04/06/2014
					registroCargado = false;
					objRta.error = true;
					objRta.mensajeError = 'Error leyendo vendorpayment.' + ', ' + e.message;
				}
			}
		}

		// FIX 04/06/2014
		if (registroCargado == true) {
			if (type == 'create' || type =='paybills') {

				// si se utiliza numerador automatico
				if (numerador_manual == 'F' && isEmpty(codigo_op)) {
					var tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
					var numeradorArray = devolverNuevoNumero(tipoTransId, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico);

					record.setFieldValue("custbody_l54_numero", numeradorArray['numerador']);
					record.setFieldValue("custbody_l54_numero_localizado", numeradorArray['numeradorPrefijo']);
					codigo_op = numeradorArray['numeradorPrefijo'];
				}

				var moneda = record.getFieldValue('currency');
				var department = record.getFieldValue('department');
				var location = record.getFieldValue('location');
				var clase = record.getFieldValue('class');

				/*var monto_ret_ganancias = parseFloat(record.getFieldValue('custbody_l54_gan_imp_a_retener')).toFixed(2);
				var monto_ret_suss = parseFloat(record.getFieldValue('custbody_l54_suss_imp_a_retener')).toFixed(2);
				var monto_ret_iva = parseFloat(record.getFieldValue('custbody_l54_iva_imp_a_retener')).toFixed(2);
				var monto_ret_iibb = parseFloat(record.getFieldValue('custbody_l54_iibb_imp_a_retener')).toFixed(2);
				var monto_ret_total = (parseFloat(monto_ret_ganancias) + parseFloat(monto_ret_suss) + parseFloat(monto_ret_iva) + parseFloat(monto_ret_iibb));
				monto_ret_total = monto_ret_total.toFixed(2);*/

				var monto_ret_ganancias = record.getFieldValue('custbody_l54_gan_imp_a_retener');
				if (isEmpty(monto_ret_ganancias) || isNaN(monto_ret_ganancias))
					monto_ret_ganancias = "0.00";
				var monto_ret_suss = record.getFieldValue('custbody_l54_suss_imp_a_retener');
				if (isEmpty(monto_ret_suss) || isNaN(monto_ret_suss))
					monto_ret_suss = "0.00";
				var monto_ret_iva = record.getFieldValue('custbody_l54_iva_imp_a_retener');
				if (isEmpty(monto_ret_iva) || isNaN(monto_ret_iva))
					monto_ret_iva = "0.00";
				var monto_ret_iibb = record.getFieldValue('custbody_l54_iibb_imp_a_retener');
				if (isEmpty(monto_ret_iibb) || isNaN(monto_ret_iibb))
					monto_ret_iibb = "0.00";

				monto_ret_ganancias = parseFloat(monto_ret_ganancias, 10).toFixed(2);
				monto_ret_suss = parseFloat(monto_ret_suss, 10).toFixed(2);
				monto_ret_iva = parseFloat(monto_ret_iva, 10).toFixed(2);
				monto_ret_iibb = parseFloat(monto_ret_iibb, 10).toFixed(2);
				var monto_ret_total = (parseFloat(monto_ret_ganancias, 10) + parseFloat(monto_ret_suss, 10) + parseFloat(monto_ret_iva, 10) + parseFloat(monto_ret_iibb, 10));
				monto_ret_total = monto_ret_total.toFixed(2);

				nlapiLogExecution('DEBUG', 'Montos usados en las retenciones generadas', ' - Retencion total: ' + monto_ret_total + ' - Retencion ganancias: ' + monto_ret_ganancias + ' - Retencion SUSS: ' + monto_ret_suss + ' - Retencion IVA: ' + monto_ret_iva + ' - Retencion IIBB: ' + monto_ret_iibb);

				// si el pago sufre algÃºn tipo de retenciÃ³n
				if (parseFloat(monto_ret_ganancias, 10) != 0 || parseFloat(monto_ret_suss, 10) != 0 || parseFloat(monto_ret_iva, 10) != 0 || parseFloat(monto_ret_iibb, 10) != 0) {

					var record_journalentry = nlapiCreateRecord('journalentry');

					record_journalentry.setFieldValue('custbody_l54_op_asociado', codigo_op);
					if (!isEmpty(subsidiary)) {
						record_journalentry.setFieldValue('subsidiary', subsidiary);
					}
					record_journalentry.setFieldValue('trandate', trandate);
					record_journalentry.setFieldValue('currency', moneda);
					record_journalentry.setFieldValue('exchangerate', parseFloat(tasa_pago, 10));

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
					record_journalentry.setCurrentLineItemValue('line', 'debit', parseFloat(monto_ret_total, 10));
					record_journalentry.commitLineItem('line');

					// Si tiene retenciones de ganancias
					if (parseFloat(monto_ret_ganancias, 10) != 0 && parseFloat(monto_ret_ganancias, 10) != '') {

						record_journalentry.selectNewLineItem('line');
						//record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

						if (!isEmpty(department))
							record_journalentry.setCurrentLineItemValue('line', 'department', department);

						if (!isEmpty(location))
							record_journalentry.setCurrentLineItemValue('line', 'location', location);

						if (!isEmpty(clase))
							record_journalentry.setCurrentLineItemValue('line', 'class', clase);

						// retenciones ganancias
						record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
						record_journalentry.setCurrentLineItemValue('line', 'account', id_ret_ganancias);
						record_journalentry.setCurrentLineItemValue('line', 'credit', parseFloat(monto_ret_ganancias, 10));
						record_journalentry.commitLineItem('line');

						// ASIGNAR NUMERADOR GANANCIAS
						if (esPagoMasivo == 'F') {
							var tipoTransIdGan = getTipoTransId('num_ret_ganancias');
							//var numeradorArray = devolverNuevoNumero(tipoTransIdGan, bocaId, letraId, subsidiaria);
							//record.setFieldValue("custbody_l54_ret_gan_numerador", numeradorArray['numeradorPrefijo']);
							// NUEVO 2014

							if (!isEmpty(idsRetGanancia) && idsRetGanancia.length > 0) {
								var arrayIDGanancias = idsRetGanancia.split(',');

								for (var j = 0; arrayIDGanancias != null && j < arrayIDGanancias.length; j++) {
									var recordRetencion = nlapiLoadRecord("customrecord_l54_retencion", arrayIDGanancias[j]);
									recordRetencion.setFieldValue("custrecord_l54_ret_ref_pago_prov", recId);
									recordRetencion.setFieldValue("custrecord_l54_ret_cod_pago_prov", codigo_op);
									// NUEVO - Si hay mas de 1 Retencion del mismo Tipo
									var numeradorArray = devolverNuevoNumero(tipoTransIdGan, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico);
									recordRetencion.setFieldValue("custrecord_l54_ret_numerador", numeradorArray['numeradorPrefijo']);
									try {
										var idRR = nlapiSubmitRecord(recordRetencion, true);
									} catch (e) {
										nlapiLogExecution('ERROR', 'Error Actualizando RecordType de Retenciones', 'NetSuite error: ' + e.message);
										objRta.error = true;
										objRta.mensajeError = 'Error Actualizando RecordType de Retenciones. GCIAS. ' + ', ' + e.message;
									}
								}
							}
						} //solo si no es masivo
					}

					// Si tiene retenciones de SUSS
					if (parseFloat(monto_ret_suss, 10) != 0 && parseFloat(monto_ret_suss, 10) != '') {

						record_journalentry.selectNewLineItem('line');
						//record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

						if (!isEmpty(department))
							record_journalentry.setCurrentLineItemValue('line', 'department', department);

						if (!isEmpty(location))
							record_journalentry.setCurrentLineItemValue('line', 'location', location);

						if (!isEmpty(clase))
							record_journalentry.setCurrentLineItemValue('line', 'class', clase);

						// retenciones SUSS
						record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
						record_journalentry.setCurrentLineItemValue('line', 'account', id_ret_suss);
						record_journalentry.setCurrentLineItemValue('line', 'credit', parseFloat(monto_ret_suss, 10));
						record_journalentry.commitLineItem('line');

						//Solo genera numerador si no vino por pago masivo. Si es pago masivo se genera previamente
						if (esPagoMasivo == 'F') {
							// ASIGNAR NUMERADOR SUSS
							var tipoTransIdSUSS = getTipoTransId('num_ret_suss');
							//var numeradorArray = devolverNuevoNumero(tipoTransIdSUSS, bocaId, letraId, subsidiaria);
							//record.setFieldValue("custbody_l54_ret_suss_numerador", numeradorArray['numeradorPrefijo']);

							// NUEVO 2014
							if (!isEmpty(idsRetSUSS) && idsRetSUSS.length > 0) {
								var arrayIDSUSS = idsRetSUSS.split(',');

								for (var j = 0; arrayIDSUSS != null && j < arrayIDSUSS.length; j++) {
									var recordRetencion = nlapiLoadRecord("customrecord_l54_retencion", arrayIDSUSS[j]);
									recordRetencion.setFieldValue("custrecord_l54_ret_ref_pago_prov", recId);
									recordRetencion.setFieldValue("custrecord_l54_ret_cod_pago_prov", codigo_op);
									// NUEVO - Si hay mas de 1 Retencion del mismo Tipo
									var numeradorArray = devolverNuevoNumero(tipoTransIdSUSS, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico);
									recordRetencion.setFieldValue("custrecord_l54_ret_numerador", numeradorArray['numeradorPrefijo']);
									try {
										var idRR = nlapiSubmitRecord(recordRetencion, true);
									} catch (e) {
										nlapiLogExecution('ERROR', 'Error Actualizando RecordType de Retenciones', 'NetSuite error: ' + e.message);
										objRta.error = true;
										objRta.mensajeError = 'Error Actualizando RecordType de Retenciones. SUSS. ' + ', ' + e.message;
									}
								}
							}
						} //numerador
					}

					// Si tiene retenciones de IVA
					if (parseFloat(monto_ret_iva, 10) != 0 && parseFloat(monto_ret_iva, 10) != '') {

						record_journalentry.selectNewLineItem('line');
						//record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

						if (!isEmpty(department))
							record_journalentry.setCurrentLineItemValue('line', 'department', department);

						if (!isEmpty(location))
							record_journalentry.setCurrentLineItemValue('line', 'location', location);

						if (!isEmpty(clase))
							record_journalentry.setCurrentLineItemValue('line', 'class', clase);

						// retenciones IVA
						record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
						record_journalentry.setCurrentLineItemValue('line', 'account', id_ret_iva);
						record_journalentry.setCurrentLineItemValue('line', 'credit', parseFloat(monto_ret_iva, 10));
						record_journalentry.commitLineItem('line');

						//Solo genera numerador si no vino por pago masivo. Si es pago masivo se genera previamente
						if (esPagoMasivo == 'F') {
							// ASIGNAR NUMERADOR IVA
							var tipoTransIdIVA = getTipoTransId('num_ret_iva');
							//var numeradorArray = devolverNuevoNumero(tipoTransIdIVA, bocaId, letraId, subsidiaria);
							//record.setFieldValue("custbody_l54_ret_iva_numerador", numeradorArray['numeradorPrefijo']);

							// NUEVO 2014
							if (!isEmpty(idsRetIVA) && idsRetIVA.length > 0) {
								var arrayIDIVA = idsRetIVA.split(',');

								for (var j = 0; arrayIDIVA != null && j < arrayIDIVA.length; j++) {
									var recordRetencion = nlapiLoadRecord("customrecord_l54_retencion", arrayIDIVA[j]);
									recordRetencion.setFieldValue("custrecord_l54_ret_ref_pago_prov", recId);
									recordRetencion.setFieldValue("custrecord_l54_ret_cod_pago_prov", codigo_op);
									// NUEVO - Si hay mas de 1 Retencion del mismo Tipo
									var numeradorArray = devolverNuevoNumero(tipoTransIdIVA, bocaId, letraId, subsidiaria, null, esLiquidoProducto, esCreditoElectronico);
									recordRetencion.setFieldValue("custrecord_l54_ret_numerador", numeradorArray['numeradorPrefijo']);
									try {
										var idRR = nlapiSubmitRecord(recordRetencion, true);
									} catch (e) {
										nlapiLogExecution('ERROR', 'Error Actualizando RecordType de Retenciones', 'NetSuite error: ' + e.message);
										objRta.error = true;
										objRta.mensajeError = 'Error Actualizando RecordType de Retenciones. IVA. ' + ', ' + e.message;
									}
								}
							}
						} //numerador retencino
					}

					// Si tiene retenciones de IIBB
					if (parseFloat(monto_ret_iibb, 10) != 0 && parseFloat(monto_ret_iibb, 10) != '') {

						// 2015 - IIBB por Jurisdicciones
						if (esPagoMasivo == 'F')
							arrayIDIIBB = idsRetIIBB.split(',');
						else {
							arrayIDIIBB = infoRetIIBB;
						}

						var recordRetencion;
						var importeIIBB;
						var jurisdiccionIIBB;

						for (var j = 0; arrayIDIIBB != null && j < arrayIDIIBB.length; j++) {
							if (esPagoMasivo == 'F') {
								recordRetencion = nlapiLoadRecord("customrecord_l54_retencion", arrayIDIIBB[j]);
								jurisdiccionIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_jurisdiccion");
								importeIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_importe");
							} else {
								jurisdiccionIIBB = arrayIDIIBB[j].jurisdiccion;
								importeIIBB = arrayIDIIBB[j].imp_retencion;
							}

							var cuentaIIBB = obtenerCuentaIIBB(subsidiaria, jurisdiccionIIBB);
							nlapiLogExecution('DEBUG', 'Generacion Journal', 'Cuenta IIBB : ' + cuentaIIBB);
							//var cuentaIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_cuenta");


							record_journalentry.selectNewLineItem('line');
							//record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

							if (!isEmpty(department))
								record_journalentry.setCurrentLineItemValue('line', 'department', department);

							if (!isEmpty(location))
								record_journalentry.setCurrentLineItemValue('line', 'location', location);

							if (!isEmpty(clase))
								record_journalentry.setCurrentLineItemValue('line', 'class', clase);

							// retenciones IIBB
							record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
							record_journalentry.setCurrentLineItemValue('line', 'account', cuentaIIBB);
							nlapiLogExecution('DEBUG', 'Jounal Retenciones', 'Importe Retencion IIBB : ' + parseFloat(importeIIBB, 10));
							record_journalentry.setCurrentLineItemValue('line', 'credit', parseFloat(importeIIBB, 10));
							record_journalentry.commitLineItem('line');

							//Solo genera numerador si no vino por pago masivo. Si es pago masivo se genera previamente
							if (esPagoMasivo == 'F') {
								// ASIGNAR NUMERADOR IIBB
								var tipoTransIdIIBB = getTipoTransId('num_ret_iibb');
								var numeradorArray = devolverNuevoNumero(tipoTransIdIIBB, bocaId, letraId, subsidiaria, jurisdiccionIIBB, esLiquidoProducto, esCreditoElectronico);
								//record.setFieldValue("custbody_l54_ret_iibb_numerador", numeradorArray['numeradorPrefijo']);

								// NUEVO 2014
								//arrayIDIIBB = idsRetIIBB.split(',');

								//for (var j = 0; arrayIDIIBB != null && j < arrayIDIIBB.length; j++) {
								//var recordRetencion = nlapiLoadRecord("customrecord_l54_retencion", arrayIDIIBB[j]);
								recordRetencion.setFieldValue("custrecord_l54_ret_ref_pago_prov", recId);
								recordRetencion.setFieldValue("custrecord_l54_ret_cod_pago_prov", codigo_op);
								recordRetencion.setFieldValue("custrecord_l54_ret_numerador", numeradorArray['numeradorPrefijo']);
								try {
									var idRR = nlapiSubmitRecord(recordRetencion, true);
								} catch (e) {
									nlapiLogExecution('ERROR', 'Error Actualizando RecordType de Retenciones', 'NetSuite error: ' + e.message);
									objRta.error = true;
									objRta.mensajeError = 'Error Actualizando RecordType de Retenciones. IIBB. ' + ', ' + e.message;
								}
								//}
							}
						}

					}

					try {
						var id_journalentry = nlapiSubmitRecord(record_journalentry, true, true);
						nlapiLogExecution('DEBUG', 'Se genero el journalentry exitosamente.', 'Id: ' + id_journalentry);
					} catch (e) {
						nlapiLogExecution('ERROR', 'Error generando el journalentry.(create)', 'NetSuite error: ' + e.message);
						objRta.error = true;
						objRta.mensajeError = 'Error generando el journalentry.(create)' + ', ' + e.message;
					}

					//Para envio por mail-pdf ret
					var pdfFileName = 'RET PAGO ' + record.getFieldValue("custbody_l54_numero_localizado") + '.pdf';
					var archAdj = nlapiCreateFile(pdfFileName, 'PLAINTEXT', 'dummy');
					var subsidiariaPDF = null;
					var esOneWorldPDF = esOneworld();
					if (esOneWorldPDF) {
						subsidiariaPDF = record.getFieldValue("subsidiary");
					}
					archAdj.setFolder(getFolderIDRetenciones(subsidiariaPDF));
					var idFile = nlapiSubmitFile(archAdj);
					record.setFieldValue('custbody_l54_pdf_retenciones', idFile);
					//Fin envio por mail-pdf ret

					// actualizo el journal entry asociado al pago, en caso de corresponder
					record.setFieldValue('custbody_l54_id_je_vendorpayment', id_journalentry);
					record.setFieldValue('custbody_l54_ret_calculadas', 'T');

					objRta.nro_asiento = id_journalentry;
				}

				var importe_neto_a_abonar_tmp = 0.00;
				importe_neto_a_abonar_tmp = redondeo2decimales(parseFloat(record.getFieldValue('total'), 10) - (parseFloat(record.getFieldValue('custbody_l54_importe_total_retencion'), 10)));

				record.setFieldValue('custbody_l54_importe_neto_a_abonar', nlapiFormatCurrency(importe_neto_a_abonar_tmp));
				record.setFieldValue('custbody_3k_neto_abonar_local_curr', nlapiFormatCurrency(parseFloat(parseFloat(importe_neto_a_abonar_tmp, 10) * parseFloat(tasa_pago, 10), 10).toFixed(2)));
				//record.setFieldValue('custbody_l54_ret_calculadas','T');

				/*Rutina de monto escrito*/
				nlapiLogExecution('DEBUG', 'procesaVendorPayment','Genero monto escrito.(create). importe:' + importe_neto_a_abonar_tmp + ',subsidiaria:' + subsidiaria);

				var numeroEnLetras = getNumeroEnLetras(importe_neto_a_abonar_tmp, subsidiaria);

				nlapiLogExecution('DEBUG', 'procesaVendorPayment','Genero monto escrito.(create). numeroEnLetras:' + numeroEnLetras);

				if (!isEmpty(numeroEnLetras))
					record.setFieldValue("custbody_l54_monto_escrito", numeroEnLetras);
				/*Fin monto escrito*/
										
				//var versionProcesoCalcRet = record.getFieldValue('custbody_l54_version_calc_ret');
				
				/*if (!isEmpty(versionProcesoCalcRet) && versionProcesoCalcRet == "2014")
					versionProcesoCalcRet = 1;
				else
					versionProcesoCalcRet = 0;*/

				var infoVendorPayment = new Object();	
				infoVendorPayment.ret_gan_numerador  = record.getFieldValue('custbody_l54_ret_gan_numerador');
				infoVendorPayment.ret_suss_numerador = record.getFieldValue('custbody_l54_ret_suss_numerador');
				infoVendorPayment.ret_iva_numerador  = record.getFieldValue('custbody_l54_ret_iva_numerador');
				infoVendorPayment.ret_iibb_numerador = record.getFieldValue('custbody_l54_ret_iibb_numerador');
				infoVendorPayment.ret_calculadas     = record.getFieldValue('custbody_l54_ret_calculadas');
				infoVendorPayment.iva_imp_a_retener  = record.getFieldValue('custbody_l54_iva_imp_a_retener');
				infoVendorPayment.suss_imp_a_retener = record.getFieldValue('custbody_l54_suss_imp_a_retener');
				infoVendorPayment.gan_imp_a_retener  = record.getFieldValue('custbody_l54_gan_imp_a_retener');
				infoVendorPayment.gan_imp_a_retener  = record.getFieldValue('custbody_l54_gan_imp_a_retener');
				infoVendorPayment.iibb_imp_a_retener = record.getFieldValue('custbody_l54_iibb_imp_a_retener');
				infoVendorPayment.subsidiaria        = subsidiariaPDF;
				infoVendorPayment.version_calc_ret   = record.getFieldValue('custbody_l54_version_calc_ret');
				infoVendorPayment.idVendorPayment    = recId;

				try {
					var idTmp = nlapiSubmitRecord(record, true);
					nlapiLogExecution('DEBUG', 'procesaVendorPayment','Se genero el Vendorpayment exitosamente (Create). Id: ' + idTmp);

					if (!isEmpty(cal_ret_auto) || cal_ret_auto =='T')
					{
						nlapiLogExecution("DEBUG", 'procesaVendorPayment', 'infoVendorPayment: '+JSON.stringify(infoVendorPayment));
						imprimirRetencionesAuto(recId,infoVendorPayment);
					}

				} catch (e) {
					nlapiLogExecution('ERROR', 'Error generando el Vendorpayment (Create)', 'NetSuite error: ' + e.message);
					objRta.error = true;
					objRta.mensajeError = 'Error generando el Vendorpayment (Create)' + ', ' + e.message;
				}
			}

			if (type == 'edit') {

				var creacionJournal = false;

				var moneda = record.getFieldValue('currency');
				var department = record.getFieldValue('department');
				var location = record.getFieldValue('location');
				var clase = record.getFieldValue('class');

				var subsidiaria = null;
				if (esOneworld())
					var subsidiaria = subsidiary;
				else
					var subsidiaria = null;

				// Obtengo el Journal del Pago a Proveedor
				var idJournalPagoProveedor = record.getFieldValue('custbody_l54_id_je_vendorpayment');

				/*var monto_ret_ganancias = parseFloat(record.getFieldValue('custbody_l54_gan_imp_a_retener')).toFixed(2);
				var monto_ret_suss = parseFloat(record.getFieldValue('custbody_l54_suss_imp_a_retener')).toFixed(2);
				var monto_ret_iva = parseFloat(record.getFieldValue('custbody_l54_iva_imp_a_retener')).toFixed(2);
				var monto_ret_iibb = parseFloat(record.getFieldValue('custbody_l54_iibb_imp_a_retener')).toFixed(2);
				var monto_ret_total = (parseFloat(monto_ret_ganancias) + parseFloat(monto_ret_suss) + parseFloat(monto_ret_iva) + parseFloat(monto_ret_iibb));
				monto_ret_total = monto_ret_total.toFixed(2);*/

				var monto_ret_ganancias = record.getFieldValue('custbody_l54_gan_imp_a_retener');
				if (isEmpty(monto_ret_ganancias) || isNaN(monto_ret_ganancias))
					monto_ret_ganancias = "0.00";
				var monto_ret_suss = record.getFieldValue('custbody_l54_suss_imp_a_retener');
				if (isEmpty(monto_ret_suss) || isNaN(monto_ret_suss))
					monto_ret_suss = "0.00";
				var monto_ret_iva = record.getFieldValue('custbody_l54_iva_imp_a_retener');
				if (isEmpty(monto_ret_iva) || isNaN(monto_ret_iva))
					monto_ret_iva = "0.00";
				var monto_ret_iibb = record.getFieldValue('custbody_l54_iibb_imp_a_retener');
				if (isEmpty(monto_ret_iibb) || isNaN(monto_ret_iibb))
					monto_ret_iibb = "0.00";

				monto_ret_ganancias = parseFloat(monto_ret_ganancias, 10).toFixed(2);
				monto_ret_suss = parseFloat(monto_ret_suss, 10).toFixed(2);
				monto_ret_iva = parseFloat(monto_ret_iva, 10).toFixed(2);
				monto_ret_iibb = parseFloat(monto_ret_iibb, 10).toFixed(2);
				var monto_ret_total = (parseFloat(monto_ret_ganancias, 10) + parseFloat(monto_ret_suss, 10) + parseFloat(monto_ret_iva, 10) + parseFloat(monto_ret_iibb, 10));
				monto_ret_total = monto_ret_total.toFixed(2);

				nlapiLogExecution('DEBUG', 'Montos usados en las retenciones generadas', ' - Retencion total: ' + monto_ret_total + ' - Retencion ganancias: ' + monto_ret_ganancias + ' - Retencion SUSS: ' + monto_ret_suss + ' - Retencion IVA: ' + monto_ret_iva + ' - Retencion IIBB: ' + monto_ret_iibb);

				/*if (parseFloat(monto_ret_ganancias, 10) == 0 || parseFloat(monto_ret_ganancias, 10) == '')
				record.setFieldValue('custbody_l54_ret_gan_numerador', '');

				if (parseFloat(monto_ret_suss, 10) == 0 || parseFloat(monto_ret_suss, 10) == '')
				record.setFieldValue('custbody_l54_ret_suss_numerador', '');

				if (parseFloat(monto_ret_iva, 10) == 0 || parseFloat(monto_ret_iva, 10) == '')
				record.setFieldValue('custbody_l54_ret_iva_numerador', '');

				if (parseFloat(monto_ret_iibb, 10) == 0 || parseFloat(monto_ret_iibb, 10) == '')
				record.setFieldValue('custbody_l54_ret_iibb_numerador', '');*/

				if (parseFloat(monto_ret_ganancias, 10) != 0 || parseFloat(monto_ret_suss, 10) != 0 || parseFloat(monto_ret_iva, 10) != 0 || parseFloat(monto_ret_iibb, 10) != 0) {

					var record_journalentry = null;

					if (!isEmpty(idJournalPagoProveedor)) {
						record_journalentry = nlapiLoadRecord('journalentry', idJournalPagoProveedor);

						/*var subsidiariaAnt = record_journalentry.getFieldValue('subsidiary');
						var monedaAnt = record_journalentry.getFieldValue('currency');
						var tipoCambioAnt = record_journalentry.getFieldValue('exchangerate');*/

						// Si alguno cambio, debo borrar el Diario, crear uno nuevo y luego asociar el Diario al Pago
						//if(subsidiariaAnt!=subsidiary || monedaAnt!=moneda || tipoCambioAnt!=tasa_pago){
						/*if(monedaAnt!=moneda || tipoCambioAnt!=tasa_pago){

						try{
						nlapiDeleteRecord('journalentry', record_journalentry);
						nlapiLogExecution('DEBUG', 'Se elimino el journalentry exitosamente.', 'Id del JE eliminado: ' + jeAsociado);
						record_journalentry = nlapiCreateRecord('journalentry');
						creacionJournal=true;
						}
						catch(e){
						nlapiLogExecution('ERROR', 'Error eliminando el journalentry.', 'NetSuite error: ' + e.message);
						}


						}
						else
					{*/
						// Si ya exisitia el Jounal borro las Lineas
						var cantidadLineasJournal = record_journalentry.getLineItemCount('line');

						for (var j = 1; j <= cantidadLineasJournal; j++) {
							record_journalentry.removeLineItem('line', 1);
						}
						creacionJournal = false;
						//}
						/*try{
						var idTmpRJ = nlapiSubmitRecord(record_journalentry, false, true);
						record_journalentry = nlapiLoadRecord('journalentry', idTmpRJ);
						nlapiLogExecution('DEBUG', 'Se genero el journalentry exitosamente ACTUALIZADO.', 'Id: ' + idTmp);
						}
						catch(e){
						nlapiLogExecution('ERROR', 'Error Actualizando el journalentry (Edit)', 'NetSuite error: ' + e.message);
						}*/
					} else {
						record_journalentry = nlapiCreateRecord('journalentry');
						creacionJournal = true;
					}

					record_journalentry.setFieldValue('custbody_l54_op_asociado', codigo_op);
					// Deberia preguntar si creacionJournal==true , si configurar la subsidiaria
					if (creacionJournal == true && !isEmpty(subsidiaria)) {
						record_journalentry.setFieldValue('subsidiary', subsidiaria);
					}
					record_journalentry.setFieldValue('trandate', trandate);
					record_journalentry.setFieldValue('currency', moneda);
					record_journalentry.setFieldValue('exchangerate', parseFloat(tasa_pago, 10));

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
					record_journalentry.setCurrentLineItemValue('line', 'debit', parseFloat(monto_ret_total, 10));
					record_journalentry.commitLineItem('line');

					nlapiLogExecution('DEBUG', 'ACtualizacion de Diario', ' Cantidad de Lineas Final 2: ' + record_journalentry.getLineItemCount('line'));

					// Si tiene retenciones de ganancias
					if (parseFloat(monto_ret_ganancias, 10) != 0 && parseFloat(monto_ret_ganancias, 10) != '') {

						record_journalentry.selectNewLineItem('line');
						//record_journalentry.setCurrentLineItemValue('line', entity, entity); // comentado el 29/08/2011

						if (!isEmpty(department))
							record_journalentry.setCurrentLineItemValue('line', 'department', department);

						if (!isEmpty(location))
							record_journalentry.setCurrentLineItemValue('line', 'location', location);

						if (!isEmpty(clase))
							record_journalentry.setCurrentLineItemValue('line', 'class', clase);

						// retenciones ganancias
						record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
						record_journalentry.setCurrentLineItemValue('line', 'account', id_ret_ganancias);
						record_journalentry.setCurrentLineItemValue('line', 'credit', parseFloat(monto_ret_ganancias, 10));
						record_journalentry.commitLineItem('line');
					}

					// Si tiene retenciones de SUSS
					if (parseFloat(monto_ret_suss, 10) != 0 && parseFloat(monto_ret_suss, 10) != '') {

						record_journalentry.selectNewLineItem('line');
						//record_journalentry.setCurrentLineItemValue('line', entity, entity); // comentado el 29/08/2011

						if (!isEmpty(department))
							record_journalentry.setCurrentLineItemValue('line', 'department', department);

						if (!isEmpty(location))
							record_journalentry.setCurrentLineItemValue('line', 'location', location);

						if (!isEmpty(clase))
							record_journalentry.setCurrentLineItemValue('line', 'class', clase);

						// retenciones SUSS
						record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
						record_journalentry.setCurrentLineItemValue('line', 'account', id_ret_suss);
						record_journalentry.setCurrentLineItemValue('line', 'credit', parseFloat(monto_ret_suss, 10));
						record_journalentry.commitLineItem('line');
					}

					// Si tiene retenciones de IVA
					if (parseFloat(monto_ret_iva, 10) != 0 && parseFloat(monto_ret_iva, 10) != '') {

						record_journalentry.selectNewLineItem('line');
						//record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

						if (!isEmpty(department))
							record_journalentry.setCurrentLineItemValue('line', 'department', department);

						if (!isEmpty(location))
							record_journalentry.setCurrentLineItemValue('line', 'location', location);

						if (!isEmpty(clase))
							record_journalentry.setCurrentLineItemValue('line', 'class', clase);

						// retenciones IVA
						record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
						record_journalentry.setCurrentLineItemValue('line', 'account', id_ret_iva);
						record_journalentry.setCurrentLineItemValue('line', 'credit', parseFloat(monto_ret_iva, 10));
						record_journalentry.commitLineItem('line');
					}

					// Si tiene retenciones de IIBB
					if (parseFloat(monto_ret_iibb, 10) != 0 && parseFloat(monto_ret_iibb, 10) != '') {
						// 2015 - IIBB por Jurisdicciones
						arrayIDIIBB = idsRetIIBB.split(',');

						for (var j = 0; arrayIDIIBB != null && j < arrayIDIIBB.length; j++) {
							var recordRetencion = nlapiLoadRecord("customrecord_l54_retencion", arrayIDIIBB[j]);
							var jurisdiccionIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_jurisdiccion");
							var cuentaIIBB = obtenerCuentaIIBB(subsidiaria, jurisdiccionIIBB);
							//var cuentaIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_cuenta");
							var importeIIBB = recordRetencion.getFieldValue("custrecord_l54_ret_importe");
							record_journalentry.selectNewLineItem('line');
							//record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

							if (!isEmpty(department))
								record_journalentry.setCurrentLineItemValue('line', 'department', department);

							if (!isEmpty(location))
								record_journalentry.setCurrentLineItemValue('line', 'location', location);

							if (!isEmpty(clase))
								record_journalentry.setCurrentLineItemValue('line', 'class', clase);

							// retenciones IIBB
							record_journalentry.setCurrentLineItemValue('line', 'memo', codigo_op);
							record_journalentry.setCurrentLineItemValue('line', 'account', cuentaIIBB);
							record_journalentry.setCurrentLineItemValue('line', 'credit', parseFloat(importeIIBB, 10));
							record_journalentry.commitLineItem('line');
						}
					}

					try {
						var idTmpJE = nlapiSubmitRecord(record_journalentry, false, true);
						nlapiLogExecution('DEBUG', 'Se genero el journalentry exitosamente.', 'Id: ' + idTmpJE);
					} catch (e) {
						nlapiLogExecution('ERROR', 'Error generando el journalentry (Edit)', 'NetSuite error: ' + e.message);
						objRta.error = true;
						objRta.mensajeError = 'Error generando el journalentry (Edit)' + ', ' + e.message;
					}

					if (creacionJournal == true) {
						//Para envio por mail-pdf ret
						var pdfFileName = 'RET PAGO ' + record.getFieldValue("custbody_l54_numero_localizado") + '.pdf';
						var archAdj = nlapiCreateFile(pdfFileName, 'PLAINTEXT', 'dummy');
						var subsidiariaPDF = null;
						var esOneWorldPDF = esOneworld();
						if (esOneWorldPDF) {
							subsidiariaPDF = record.getFieldValue("subsidiary");
						}
						archAdj.setFolder(getFolderIDRetenciones(subsidiariaPDF));
						var idFile = nlapiSubmitFile(archAdj);
						record.setFieldValue('custbody_l54_pdf_retenciones', idFile);
						//Fin envio por mail-pdf ret

						record.setFieldValue('custbody_l54_id_je_vendorpayment', idTmpJE);
					}
					record.setFieldValue('custbody_l54_ret_calculadas', 'T');

					objRta.nro_asiento = idTmpJE;
				} else {
					// Si se cancelaron Todas las retenciones , borro el Diario o deberia poner los importes en 0
					if (!isEmpty(idJournalPagoProveedor)) {
						try {
							nlapiDeleteRecord('journalentry', idJournalPagoProveedor);
							record.setFieldValue('custbody_l54_id_je_vendorpayment', '');
							record.setFieldValue('custbody_l54_ret_calculadas', 'F');
							nlapiLogExecution('DEBUG', 'Se elimino el journalentry exitosamente.', 'Id del JE eliminado: ' + idJournalPagoProveedor);
						} catch (e) {
							nlapiLogExecution('ERROR', 'Error eliminando el journalentry.', 'NetSuite error: ' + e.message);
							objRta.error = true;
							objRta.mensajeError = 'Error eliminando el journalentry' + ', ' + e.message;
						}
					}
				}

				// Calculo los siguientes datos, haya o no haya tenido retenciÃ³n
				// obtengo el importe neto a abonar ( total - retenciones )
				//Fix 22/05/2014
				//var importe_neto_a_abonar_tmp = redondeo2decimales(parseFloat(record.getFieldValue('total')) - (parseFloat(record.getFieldValue('custbody_l54_importe_total_retencion')) / tasa_pago));
				var importe_neto_a_abonar_tmp = redondeo2decimales(parseFloat(0.00, 10));
				if (!isEmpty(record.getFieldValue('total')) && record.getFieldValue('total') > 0.00)
					importe_neto_a_abonar_tmp = redondeo2decimales(parseFloat(record.getFieldValue('total'), 10) - (parseFloat(record.getFieldValue('custbody_l54_importe_total_retencion'), 10)));
				// Fin Fix 22/05/2014
				if (parseFloat(importe_neto_a_abonar_tmp, 10) < 0.00)
					importe_neto_a_abonar_tmp = redondeo2decimales(parseFloat(0.00, 10)); ;
				record.setFieldValue('custbody_l54_importe_neto_a_abonar', nlapiFormatCurrency(importe_neto_a_abonar_tmp));
				record.setFieldValue('custbody_3k_neto_abonar_local_curr', nlapiFormatCurrency(parseFloat(parseFloat(importe_neto_a_abonar_tmp, 10) * parseFloat(tasa_pago, 10), 10).toFixed(2)));

				/*Rutina de monto escrito*/
				nlapiLogExecution('DEBUG', 'Genero monto escrito.(edit)', 'importe:' + importe_neto_a_abonar_tmp + ',subsidiaria:' + subsidiaria);

				var numeroEnLetras = getNumeroEnLetras(importe_neto_a_abonar_tmp, subsidiaria);

				nlapiLogExecution('DEBUG', 'Genero monto escrito.(edit)', 'numeroEnLetras:' + numeroEnLetras);

				if (!isEmpty(numeroEnLetras))
					record.setFieldValue("custbody_l54_monto_escrito", numeroEnLetras);
				/*Fin monto escrito*/

				try {
					var idTmp = nlapiSubmitRecord(record, true);
					nlapiLogExecution('DEBUG', 'Se actualizo el Vendorpayment exitosamente (Edit)', 'Id: ' + idTmp);
				} catch (e) {
					nlapiLogExecution('ERROR', 'Error actualizando el Vendorpayment (Edit)', 'NetSuite error: ' + e.message);
					objRta.error = true;
					objRta.mensajeError = 'Error actualizando el Vendorpayment (Edit)' + ', ' + e.message;
				}

			}
		}
	} catch (err) {
		nlapiLogExecution('ERROR', 'Error after submit del Vendorpayment', 'NetSuite error: ' + err.message);
		objRta.error = true;
		objRta.mensajeError = 'Error after submit del Vendorpayment' + ', ' + err.message;
	}

	nlapiLogExecution('DEBUG', 'After Submit Vendorpayment ', 'Fin');
}

/*
23/09/2014
No Se Usa, se Crearon los Campos con Sourcing al RecordType ParametrizaciÃ³n de Retenciones
 */
/*
function l54loadVendorbill(type, form){
// la idea es a futuro pasarlos a campos de NetSuite
if (type == "create" || type == "edit"){

var tipo_retencion_ganancias = 1; // ID Ganancias
var tipo_retencion_iva = 2; // ID IVA
var tipo_retencion_iibb	= 3; // ID IIBB
var tipo_retencion_suss	= 4; // ID SUSS

generarSelectCodRetencion(form, tipo_retencion_ganancias, 'gan', 'CÃ³digo de Ret. Ganancias'); // 1era. versiÃ³n
generarSelectCodRetencion(form, tipo_retencion_iva, 'iva', 'CÃ³digo de Ret. IVA'); // 1era. versiÃ³n
generarSelectCodRetencion(form, tipo_retencion_iibb, 'iibb', 'CÃ³digo de Ret. IIBB'); // 2da. versiÃ³n
generarSelectCodRetencion(form, tipo_retencion_suss, 'suss', 'CÃ³digo de Ret. SUSS'); // 2da. versiÃ³n
}
}
 */

function l54beforeSubmitVendorbill(type) {

	nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'INICIO - Before Submit - Type: ' + type);

	try {
		if (type == 'create' || type == 'edit') {
			//nlapiLogExecution('DEBUG', 'Grabar Transaccion','ID Interno Transaccion : ' + nlapiGetFieldValue('tranid') + ' Fecha Inicio : ' + new Date());
			var esONG = esEmpresaONG();
	
			nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'LINE 5526 - Es ONG: ' + esONG);
			if (esONG) {
				var numberOfItems = nlapiGetLineItemCount('item');
				nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'INICIO - Recorrido sublista items o articulos');

				for (var i = 1; i <= numberOfItems; i++) {
					nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'LINE 5594 - SUBLIST ITEMS - item line: ' + i);
					var impuesto_ong = nlapiGetLineItemText('item', 'custcol_l54_impuesto_ong', i);
					/* var impuesto_ong = nlapiGetLineItemValue('item', 'custcol_l54_impuesto_impuesto_ong', i);
					var porcentaje_final_ong = impuesto_ong; */
					var porcentaje_final_ong = false;

					if (!isEmpty(impuesto_ong)) {
	
						nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'LINE 5536 - Valores - impuesto_ong: ' + impuesto_ong);
						//var impuesto_ong = nlapiGetLineItemValue('item', 'custcol_l54_impuesto_porcentaje_ong', i);
						//var id_impuesto_afip_ong = nlapiGetLineItemValue('item', 'custcol_l54_id_impuesto_afip_ong', i);
		
						if (!isEmpty(impuesto_ong)) {
							
							if (impuesto_ong.search('%') != -1)
								porcentaje_final_ong = true
		
							if (porcentaje_final_ong) {
								var porcentaje_final_ong_def_aux = impuesto_ong.replace(/[^0-9.]/g,"");
								var porcentaje_final_ong_def = 1 + parseFloat(parseFloat(porcentaje_final_ong_def_aux, 10) / 100, 10);
								var amount = nlapiGetLineItemValue('item', 'amount', i);
								var base_calculo_ong = parseFloat(parseFloat(amount, 10) / parseFloat(porcentaje_final_ong_def, 10) , 10).toFixedOK(2);
								nlapiSetLineItemValue('item', 'custcol_l54_base_calculo_ret_ong', i, base_calculo_ong);
								var porcentaje_field = impuesto_ong.replace(/[^0-9.%]/g,"");
								nlapiSetLineItemValue('item', 'custcol_l54_impuesto_porcentaje_ong', i, porcentaje_field);
								nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'LINE 5548 - Ingresa a calcular la base de cálculo ONG - Valores - amount: ' + amount + ' - porcentaje_final_ong: ' + porcentaje_final_ong + ' - base_calculo_ong: ' + base_calculo_ong);
							} else {
								var amount = nlapiGetLineItemValue('item', 'amount', i);
								nlapiSetLineItemValue('item', 'custcol_l54_base_calculo_ret_ong', i, amount);
								nlapiSetLineItemValue('item', 'custcol_l54_impuesto_porcentaje_ong', i, '0.0%');
							}
						} else {
							if (isEmpty(impuesto_ong)) {
								var amount = nlapiGetLineItemValue('item', 'amount', i);
								nlapiSetLineItemValue('item', 'custcol_l54_base_calculo_ret_ong', i, amount);
								nlapiSetLineItemValue('item', 'custcol_l54_impuesto_porcentaje_ong', i, '0.0%');
								nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'LINE 5553 - Ingresa a calcular la base de cálculo ONG - Valores - amount: ' + amount + ' - porcentaje_final_ong: ' + porcentaje_final_ong + ' - base_calculo_ong: ' + base_calculo_ong);
							}
						}
					}
				}
				nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'FIN - Recorrido sublista items o articulos');
				var numberOfItems = nlapiGetLineItemCount('expense');
				nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'INICIO - Recorrido sublista expensas o gastos');
				
				for (var i = 1; i <= numberOfItems; i++) {
					
					nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'LINE 5640 - SUBLIST EXPENSES - expense line: ' + i);
					var impuesto_ong = nlapiGetLineItemText('expense', 'custcol_l54_impuesto_ong', i);
					/* var impuesto_ong = nlapiGetLineItemValue('expense', 'custcol_l54_impuesto_impuesto_ong', i);
					var porcentaje_final_ong = impuesto_ong; */
					var porcentaje_final_ong = false;

					if (!isEmpty(impuesto_ong)) {
	
						nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'LINE 5648 - Valores - impuesto_ong: ' + impuesto_ong);
						//var impuesto_ong = nlapiGetLineItemValue('expense', 'custcol_l54_impuesto_porcentaje_ong', i);
						//var id_impuesto_afip_ong = nlapiGetLineItemValue('expense', 'custcol_l54_id_impuesto_afip_ong', i);
		
						if (!isEmpty(impuesto_ong)) {
							
							if (impuesto_ong.search('%') != -1)
								porcentaje_final_ong = true
		
							if (porcentaje_final_ong) {
								var porcentaje_final_ong_def_aux = impuesto_ong.replace(/[^0-9.]/g,"");
								var porcentaje_final_ong_def = 1 + parseFloat(parseFloat(porcentaje_final_ong_def_aux, 10) / 100, 10);
								var amount = nlapiGetLineItemValue('expense', 'amount', i);
								var base_calculo_ong = parseFloat(parseFloat(amount, 10) / parseFloat(porcentaje_final_ong_def, 10) , 10).toFixedOK(2);
								nlapiSetLineItemValue('expense', 'custcol_l54_base_calculo_ret_ong', i, base_calculo_ong);
								var porcentaje_field = impuesto_ong.replace(/[^0-9.%]/g,"");
								nlapiSetLineItemValue('expense', 'custcol_l54_impuesto_porcentaje_ong', i, porcentaje_field);
								nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'LINE 5664 - Ingresa a calcular la base de cálculo ONG - Valores - amount: ' + amount + ' - porcentaje_final_ong: ' + porcentaje_final_ong + ' - base_calculo_ong: ' + base_calculo_ong);
							} else {
								var amount = nlapiGetLineItemValue('expense', 'amount', i);
								nlapiSetLineItemValue('expense', 'custcol_l54_base_calculo_ret_ong', i, amount);
								nlapiSetLineItemValue('expense', 'custcol_l54_impuesto_porcentaje_ong', i, '0.0%');
							}
						} else {
							if (isEmpty(impuesto_ong)) {
								var amount = nlapiGetLineItemValue('expense', 'amount', i);
								nlapiSetLineItemValue('expense', 'custcol_l54_base_calculo_ret_ong', i, amount);
								nlapiSetLineItemValue('expense', 'custcol_l54_impuesto_porcentaje_ong', i, '0.0%');
								nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'LINE 5675 - Ingresa a calcular la base de cálculo ONG - Valores - amount: ' + amount + ' - porcentaje_final_ong: ' + porcentaje_final_ong + ' - base_calculo_ong: ' + base_calculo_ong);
							}
						}
					}
				}
				nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'FIN - Recorrido sublista expensas o gastos');
			}
	
			// actualizaciÃ³n de lineas por IVA
			actualizarLineasPorIva();
			
			// Actualizar el Codigo de Moneda AFIP
			var monedaId = nlapiGetFieldValue('currency');
			if (!isEmpty(monedaId)) {
				var monedaAFIPId = obtenerIDMoneda(monedaId);
				if (!isEmpty(monedaAFIPId)) {
					nlapiSetFieldValue("custbody_l54_tipo_moneda", monedaAFIPId);
				}
			}
	
			if (isEmpty(nlapiGetFieldValue('custbody_l54_cod_trans_afip_cpras'))) {
				// Grabar ID Tipo Transaccion AFIP
				var tipoTransStr = nlapiGetRecordType();
				var letra = nlapiGetFieldValue('custbody_l54_letra');
	
				if (!isEmpty(tipoTransStr) && !isEmpty(letra)) {
	
					var tipoTransaccionNS = getTipoTransId(tipoTransStr);
	
					if (!isEmpty(tipoTransaccionNS)) {
	
						var filtros = new Array();
						filtros[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
						filtros[1] = new nlobjSearchFilter('custrecord_l54_id_afip_tipo_trans', null, 'is', tipoTransaccionNS);
						filtros[2] = new nlobjSearchFilter('custrecord_l54_id_afip_letra', null, 'is', letra);
	
						var columnas = new Array();
						columnas[0] = new nlobjSearchColumn('custrecord_l54_id_afip_id');
	
						var resultados = new nlapiSearchRecord('customrecord_l54_id_trans_afip', null, filtros, columnas);
	
						if (resultados != null && resultados.length > 0) {
							var idTransaccionAFIP = resultados[0].getValue('custrecord_l54_id_afip_id');
							if (!isEmpty(idTransaccionAFIP)) {
								nlapiSetFieldValue("custbody_l54_cod_trans_afip_cpras", idTransaccionAFIP);
							}
						}
					}
				}
			}
			nlapiSetFieldValue("custbody_l54_reg_inf_trans_act", 'T');
			
			//nlapiLogExecution('DEBUG', 'Grabar Transaccion','ID Interno Transaccion : ' + nlapiGetFieldValue('tranid') + ' Fecha Fin : ' + new Date());
			
			/** Modificación Retención Factura M */
			var letraM = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_vendorbill_servidor_letra');
			var typeTrans = nlapiGetRecordType();
			if (!isEmpty(letraM) && typeTrans == "vendorbill") {
				nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'Entro a validar ');
				var ivaRet = 'F',
					ganRet = 'F';
				
				if(!isEmpty(nlapiGetFieldValue("custbody_l54_codigo_ret_iva"))){
					ivaRet = nlapiLookupField('customrecord_l54_param_ret', nlapiGetFieldValue("custbody_l54_codigo_ret_iva"), 'custrecord_l54_param_ret_ret_fact_m');
				}

				if(!isEmpty(nlapiGetFieldValue("custbody_l54_codigo_ret_gan"))){
					ganRet = nlapiLookupField('customrecord_l54_param_ret', nlapiGetFieldValue("custbody_l54_codigo_ret_gan"), 'custrecord_l54_param_ret_ret_fact_m');
				}
				var letraTransacction = nlapiGetFieldValue("custbody_l54_letra");
				if(!isEmpty(letraTransacction) && letraTransacction != letraM && ((!isEmpty(ganRet) && ganRet == 'T') || (!isEmpty(ivaRet) && ivaRet == 'T'))){
					nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'Valido correctamente ' );
					var messageError = nlapiCreateError("ERROR_FACTURAM", "Se ha indicado una retencion de factura M para un comprobante con una letra distinta a M.", false);
					throw messageError;
			}
		}
		}
	} catch (e) {
		nlapiLogExecution('ERROR', 'l54beforeSubmitVendorbill', 'Error - Before Submit - Exception Error: ' + e.message);
		throw 'Error en Before Submit: ' + e.message || 'Unexpected error' ;
	}
	
	nlapiLogExecution('DEBUG', 'l54beforeSubmitVendorbill', 'FIN - Before Submit - Type: ' + type);
}

/*
23/09/2014
No Se Usa, se Crearon los Campos con Sourcing al RecordType ParametrizaciÃ³n de Retenciones
 */
/*function l54loadVendor(type, form){
// la idea es en un futuro pasarlo a campos de NetSuite
if (type == "create" || type == "edit"){

var tipo_retencion_ganancias = 1; // ID Ganancias
var tipo_retencion_iva = 2; // ID IVA
var tipo_retencion_iibb = 3; // ID IIBB
var tipo_retencion_suss	= 4; // ID SUSS

generarSelectCodRetencion(form, tipo_retencion_ganancias, 'gan', 'CÃ³digo de Ret. Ganancias');
generarSelectCodRetencion(form, tipo_retencion_iva, 'iva', 'CÃ³digo de Ret. IVA');
generarSelectCodRetencion(form, tipo_retencion_iibb, 'iibb', 'CÃ³digo de Ret. IIBB');
generarSelectCodRetencion(form, tipo_retencion_suss, 'suss', 'CÃ³digo de Ret. SUSS');
}
}*/

function l54beforeSubmitVendorcredit(type) {

	if (type == 'create' || type == 'edit') {

		// actualizaciÃ³n de lineas por IVA
		actualizarLineasPorIva();
	}
}

function l54beforeSubmitPurchaseorder(type) {

	if (type == 'create' || type == 'edit') {

		// actualizaciÃ³n de lineas por IVA
		actualizarLineasPorIva();
	}
}

function anularPagoProveedor(type) {
	if (type == 'create') {
		// Verifico si se esta anulando un pago a Proveedor
		var recId = nlapiGetRecordId();
		var recType = nlapiGetRecordType();

		if (!isEmpty(recId)) {

			try {
				var recordDiario = nlapiLoadRecord(recType, recId);
				var registroAnulacion = recordDiario.getFieldValue('createdfrom');
				var trandate = recordDiario.getFieldValue('trandate');
				//var fechaDiarioDate = nlapiStringToDate(fechaDiarioString, 'datetimetz');
				//var fechadiarioFinalString = nlapiDateToString(fechaDiarioDate, 'date');
				if (!isEmpty(registroAnulacion)) {
					var filters = new nlobjSearchFilter('internalid', null, 'is', registroAnulacion);

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
								var recordPagoProveedor = nlapiLoadRecord(recordType, registroAnulacion);
								var recVoided = recordPagoProveedor.getFieldValue('voided');
								var recStatus = recordPagoProveedor.getFieldValue('status');
								var codigo_op = recordPagoProveedor.getFieldValue('custbody_l54_numero_localizado');
								var entity = recordPagoProveedor.getFieldValue('entity');
								//var trandate = recordPagoProveedor.getFieldValue('trandate');
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

								monto_ret_ganancias = parseFloat(monto_ret_ganancias, 10).toFixed(2);
								monto_ret_suss = parseFloat(monto_ret_suss, 10).toFixed(2);
								monto_ret_iva = parseFloat(monto_ret_iva, 10).toFixed(2);
								monto_ret_iibb = parseFloat(monto_ret_iibb, 10).toFixed(2);
								var monto_ret_total = (parseFloat(monto_ret_ganancias, 10) + parseFloat(monto_ret_suss, 10) + parseFloat(monto_ret_iva, 10) + parseFloat(monto_ret_iibb, 10));
								monto_ret_total = monto_ret_total.toFixed(2);

								registroCargado = true;
							} catch (e) {
								registroCargado = false;
								nlapiLogExecution('ERROR', 'Error Leyendo Pago a Proveedor', 'NetSuite error: ' + e.message);
							}

							// FIX 04/06/2014
							if (registroCargado == true) {

								if (parseFloat(monto_ret_ganancias) != 0 || parseFloat(monto_ret_suss) != 0 || parseFloat(monto_ret_iva) != 0 || parseFloat(monto_ret_iibb) != 0) {

									// creo un journal entry con el reverse del journal entry que cree en el alta de la transacciÃ³n
									var record_journalentry = nlapiCreateRecord('journalentry');

									record_journalentry.setFieldValue('custbody_l54_op_asociado', codigo_op);
									if (!isEmpty(subsidiary)) {
										record_journalentry.setFieldValue('subsidiary', subsidiary);
                                    }
                                    if (!isEmpty(trandate)) {
                                     record_journalentry.setFieldValue('trandate', trandate);
                                    }
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

									// si tiene retenciones de ganancias
									if (parseFloat(monto_ret_ganancias) != 0 && parseFloat(monto_ret_ganancias) != '') {

										record_journalentry.selectNewLineItem('line');
										//record_journalentry.setCurrentLineItemValue('line', entity, entity); // comentado el 29/08/2011

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
										//record_journalentry.setCurrentLineItemValue('line', entity, entity); // comentado el 29/08/2011

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
										//record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

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
											//record_journalentry.setCurrentLineItemValue('line', 'entity', entity); // comentado el 29/08/2011

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
										nlapiLogExecution('DEBUG', 'Se genero el journalentry exitosamente.', 'Id: ' + idTmp);
									} catch (e) {
										nlapiLogExecution('ERROR', 'Error generando el journalentry (Edit)', 'NetSuite error: ' + e.message);
									}
								}
							}

							// Fin Crear Reverse del ASiento

							// Busco las Retenciones del Pago
							var filtroRetenciones = new Array();
							filtroRetenciones[0] = new nlobjSearchFilter('custrecord_l54_ret_ref_pago_prov', null, 'is', registroAnulacion);
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
						}
					}
				}
			} catch (e) {
				nlapiLogExecution('ERROR', 'Error Anulando Retenciones', 'NetSuite error: ' + e.message);
			}
		}
	}
}

function obtenerCuentaIIBB(subsidiaria, jurisdiccionIIBB) {
	nlapiLogExecution('DEBUG', 'obtenerCuentaIIBB', 'subsidiaria:' + subsidiaria + ',jurisdiccionIIBB:' + jurisdiccionIIBB);

	var idCuenta = 0;
	if (!isEmpty(jurisdiccionIIBB)) {
		var filtroConfGeneral = new Array();
		filtroConfGeneral[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		if (!isEmpty(subsidiaria))
			filtroConfGeneral[1] = new nlobjSearchFilter('custrecord_l54_pv_gral_subsidiaria', null, 'is', subsidiaria);
		var columnaConfGeneral = new Array();
		columnaConfGeneral[0] = new nlobjSearchColumn('internalid');

		var resultadosConfGeneral = new nlapiSearchRecord("customrecord_l54_pv_iibb_config_general", null, filtroConfGeneral, columnaConfGeneral);

		nlapiLogExecution('DEBUG', 'obtenerCuentaIIBB', 'resultadosConfGeneral:' + resultadosConfGeneral + ',resultadosConfGeneral.length:' + resultadosConfGeneral.length);

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

				nlapiLogExecution('DEBUG', 'obtenerCuentaIIBB', 'resultadosConfDetalle:' + JSON.stringify(resultadosConfDetalle) + ',resultadosConfDetalle.length:' + resultadosConfDetalle.length);

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

function getFolderIDRetenciones(subsidiaria) {

	var columns = [new nlobjSearchColumn("custrecord_l54_folderid_retenciones")];

	var filters = new Array();
	if (!isEmpty(subsidiaria))
		filters[0] = new nlobjSearchFilter('custrecord_l54_subsidiaria', null, 'is', subsidiaria);

	var searchresults = null;
	if (!isEmpty(subsidiaria))
		searchresults = new nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, filters, columns);
	else
		searchresults = new nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, null, columns);

	var folderid = -1;
	for (var i = 0; searchresults != null && i < searchresults.length; i++)
		folderid = searchresults[i].getValue("custrecord_l54_folderid_retenciones");

	return folderid;
}

function recalcularDescuentoGeneralCompleto() {
	try {
		var porcentajeDescGralC = nlapiGetFieldValue('custbody_l54_porcentaje_desc_gral');
		var porcentajeDescGral = parseInt(0, 10);
		if (!isEmptyOK(porcentajeDescGralC)) {
			porcentajeDescGral = parseFloat(porcentajeDescGralC, 10);
		} else {
			porcentajeDescGral = 0;
		}

		if (!isEmptyOK(porcentajeDescGral) && !isNaN(porcentajeDescGral)) {

			var cantidadItems = nlapiGetLineItemCount('item');

			if (!isEmptyOK(cantidadItems) && !isNaN(cantidadItems) && cantidadItems > 0) {
				// Aplicar el Descuento General A Totodas las Lineas de Articulos
				var importeDescuentoGeneralTotal = 0;
				for (var i = 1; i <= cantidadItems; i++) {
					nlapiSelectLineItem('item',i);
					calcularDescuento('item',true);
					nlapiCommitLineItem('item');
				}
			} else {
				// No Se ingresaron Articulos a los cuales Aplciar el Descuento General
				var mensaje = "No Se ingresaron Articulos a los cuales Aplciar el Descuento General";
				nlapiLogExecution('ERROR', 'Calculo Descuento General', mensaje);
			}

		} else {
			// El Porcentaje de Descuento General es Invalido
			var mensaje = "No se ingreso el Procentaje de Descuento A Aplicar";
			if (!isEmptyOK(porcentajeDescGral) && isNaN(porcentajeDescGral)) {
				mensaje = "El Porcentaje de Descuento General Ingresado no es Valido";
			}
			nlapiLogExecution('ERROR', 'Calculo Descuento General', mensaje);
		}
	} catch (excepcion) {
		var mensaje = "Error Calculando Descuento General - Error : " + excepcion.message;
		nlapiLogExecution('ERROR', 'Calculo Descuento General', mensaje);
	}
}


function l54btnAnularRetenciones(type, form) {

	nlapiLogExecution('DEBUG', 'l54btnAnularRetenciones', 'OPEN');

	//Se verifica la preferencia de contabilidad para determinar si de debe mostrar el boton
	//var acc_config      = nlapiLoadConfiguration('accountingpreferences');
	//var reversalvoiding = acc_config.getFieldValue('reversalvoiding');    
	var recId 		    = nlapiGetRecordId();
	var recType 		= nlapiGetRecordType();

	if (!isEmpty(recId)){
		var record_transac  = nlapiLoadRecord(recType,recId);

		if (!isEmpty(record_transac)){
			var ret_anuladas = record_transac.getFieldValue('custbody_l54_ret_anuladas');		
		}

	}

	nlapiLogExecution('DEBUG', 'l54btnAnularRetenciones', 'recId: '+recId+'. recType: '+recType+'. type: '+type+'. ret_anuladas: '+ret_anuladas);

	if (type == 'view' && recType == 'vendorpayment' && ret_anuladas == 'F') { 
		nlapiLogExecution('DEBUG', 'l54btnAnularRetenciones', 'Inicio Validacion');
		var tipoRetGan = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_gan');
		var tipoRetIva = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_iva');
		var tipoRetIibb = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_iibb');
		var tipoRetSuss = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_suss');
		var tipoRetMuni = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_municipal');
		var tipoRetInym = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_inym');
		var tipoTransacInymAnul = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_inym_anul');
		var tipoTransacMuniAnul = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_municipal_anul');
		var tipoTransacGanAnul = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_gan_anul');
		var tipoTransacIvaAnul = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_iva_anul');
		var tipoTransacIibbAnul = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_iibb_anul');
		var tipoTransacSussAnul = nlapiGetContext().getSetting('SCRIPT', 'custscript_l54_anul_ret_suss_anul');
		nlapiLogExecution('DEBUG', 'l54btnAnularRetenciones', 'Parametros:    tipoRetGan: '+ tipoRetGan + ', tipoRetIva:'+ tipoRetIva + ", tipoRetIibb: "+ tipoRetIibb + ", tipoRetSuss: " + tipoRetSuss + ", tipoTransacGanAnul: "+ tipoTransacGanAnul + ", tipoTransacIvaAnul: " + tipoTransacIvaAnul + ", tipoTransacIibbAnul: " + tipoTransacIibbAnul + ", tipoTransacSussAnul: "+ tipoTransacSussAnul + ", tipoTransacMuniAnul: " + tipoTransacMuniAnul + ", tipoRetMuni: "+ tipoRetMuni);
		form.setScript('customscript_l54_enlace_l54_ret_v2012');
		form.addButton('custpage_calcular_retenciones', 'Anular OP y Retenciones', "anularRetenciones("+tipoRetGan+","+tipoRetIva+","+tipoRetIibb+","+tipoRetSuss+","+tipoTransacGanAnul+","+tipoTransacIvaAnul+","+tipoTransacIibbAnul+","+tipoTransacSussAnul+","+tipoRetMuni+","+tipoTransacMuniAnul+","+tipoRetInym+","+tipoTransacInymAnul+")");
	}
	nlapiLogExecution('DEBUG', 'l54btnAnularRetenciones', 'CLOSE');
}

function getLetraId(letraStr) {

	var letraId = null;

	if (letraStr == 'A')
		letraId = 1;
	else if (letraStr == 'B')
		letraId = 2;
	else if (letraStr == 'C')
		letraId = 3;
	else if (letraStr == 'E')
		letraId = 4;
	else if (letraStr == 'R')
		letraId = 5;
	else if (letraStr == 'X')
		letraId = 6;

	return letraId;
}

/*PC-1
Funcion: obtenerPuntoVenta
Descripcion: Obtiene para la subsidiaria en cuestion, el tipo de transaccion, y la Location => la Boca preferida
 */
function obtenerPuntoVenta() {
	var esND = nlapiGetFieldValue('custbody_l54_nd');
	var tipoTransStr = nlapiGetRecordType();

	if (esOneworld())
		var subsidiaria = nlapiGetFieldValue('subsidiary');
	else
		var subsidiaria = null;

	var tipoTransId = numeradorAUtilizar(getTipoTransId(tipoTransStr), esND, subsidiaria);

	var categoriaNumerador = null;

	var locationId = nlapiGetFieldValue('location');
	if (!isEmpty(locationId)) {
		categoriaNumerador = nlapiLoadRecord('location', nlapiGetFieldValue('location')).getFieldValue('custrecord_l54_loc_categoria_numerador');
	}

	return getBocaPreferidaParaTrans(tipoTransId, subsidiaria, categoriaNumerador);
}

function obtener_arreglo_codigos_ret_vendorbill(entidad, billsPagar, subsidiaria) {
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

	var resultsCodigosVB = new nlapiSearchRecord("transaction", "customsearch_l54_bill_cod_ret", filters, null);
	
	var informacionCodigosVB = new Array();

	if (!isEmpty(resultsCodigosVB) && resultsCodigosVB.length > 0) {
		for (var contTC = 0; contTC < resultsCodigosVB.length; contTC++) {
			var result = resultsCodigosVB[contTC];
			var columns = result.getAllColumns();
			informacionCodigosVB[contTC] = new Object();
			/*informacionCodigosVB[contTC].idInterno = resultsCodigosVB[contTC].getValue('internalid');
			informacionCodigosVB[contTC].importeTotal = (Math.abs(parseFloat(resultsCodigosVB[contTC].getValue('fxamount'),10)));
			informacionCodigosVB[contTC].codigoRetGanancias = resultsCodigosVB[contTC].getValue('internalid', 'custbody_l54_codigo_ret_gan');
			informacionCodigosVB[contTC].codigoRetIVA = resultsCodigosVB[contTC].getValue('internalid', 'custbody_l54_codigo_ret_iva');
			informacionCodigosVB[contTC].codigoRetSUSS = resultsCodigosVB[contTC].getValue('internalid', 'custbody_l54_codigo_ret_suss');*/
			informacionCodigosVB[contTC].idInterno = result.getValue(columns[1]);//ID Interno
			informacionCodigosVB[contTC].importeTotal = ((parseFloat(result.getValue(columns[2]),10)));// Importe Total
			//nlapiLogExecution("DEBUG", 'TIEMPOS', "ID : " + result.getValue(columns[1]) + " OBTENER IMP COD : " + result.getValue(columns[2]));
			informacionCodigosVB[contTC].codigoRetGanancias = result.getValue(columns[3]);// Codigo Retencion Ganancias
			informacionCodigosVB[contTC].codigoRetIVA = result.getValue(columns[4]);// Codigo Retencion IVA
			informacionCodigosVB[contTC].codigoRetSUSS = result.getValue(columns[5]);// Codigo Retencion SUSS
			informacionCodigosVB[contTC].esFacturaM = result.getValue(columns[6]);// Indica si es una Transaccion M
			}
		}

	return informacionCodigosVB;
}

function convertToBoolean(string) {
	return ((isEmpty(string) || string == 'F' || string == false) ? false : true);
}

//FDS1: Se agrega el parametro Subsidiaria
function obtener_arreglo_netos_vendorbill(entidad, billsPagar, subsidiaria) {
	// obtengo la matriz de ID VENDOR BILL || NETO usando el SS "customsearch_l54_bill_net_amt"
	var columns = [new nlobjSearchColumn('internalid', null, 'group'),
		new nlobjSearchColumn('fxamount', null, 'sum')];
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('entity', null, 'is', entidad);
	filters[1] = new nlobjSearchFilter('internalid', null, 'anyof', billsPagar);
	/*FDS1** inicio*/
	if (!isEmpty(subsidiaria))
		filters[2] = new nlobjSearchFilter('subsidiary', null, 'is', subsidiaria);
	/*FDS1** Fin*/

	var resultsNetosVB = new nlapiSearchRecord("transaction", "customsearch_l54_bill_net_amt", filters, columns);

	return resultsNetosVB;
}

function obtener_codigos_vendorbill(arregloCodigosVendorBill, idVendorBill) {

	var resultadoCodigos=new Object();
	resultadoCodigos.codigoRetGanancias='';
	resultadoCodigos.codigoRetIVA='';
	resultadoCodigos.codigoRetSUSS='';
	resultadoCodigos.importeTotal=0.00;
	resultadoCodigos.esFacturaM=false;
	
	if(arregloCodigosVendorBill!=null && arregloCodigosVendorBill.length>0 && !isEmpty(idVendorBill)){
	
		var resultadoCodigosRetencion = arregloCodigosVendorBill.filter(function (obj) {
			return obj.idInterno === idVendorBill;
		});

		if (!isEmpty(resultadoCodigosRetencion) && resultadoCodigosRetencion.length > 0) {
				resultadoCodigos.importeTotal = resultadoCodigosRetencion[0].importeTotal;
				resultadoCodigos.codigoRetGanancias = resultadoCodigosRetencion[0].codigoRetGanancias;
				resultadoCodigos.codigoRetIVA = resultadoCodigosRetencion[0].codigoRetIVA;
				resultadoCodigos.codigoRetSUSS = resultadoCodigosRetencion[0].codigoRetSUSS;
				resultadoCodigos.esFacturaM = resultadoCodigosRetencion[0].esFacturaM;
		}
	}

	return resultadoCodigos;
}

function numeradorAUtilizar(tipoTransNetSuite, esND, subsidiaria) {

	var columns = [new nlobjSearchColumn("custrecord_l54_tipo_trans_l54")];

	var filters = new Array();
	filters[0] = new nlobjSearchFilter('custrecord_l54_tipo_trans_netsuite', null, 'is', tipoTransNetSuite);
	filters[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F');

	if (!isEmpty(esND))
		filters[2] = new nlobjSearchFilter('custrecord_l54_es_nd', null, 'is', esND);
	else
		filters[2] = new nlobjSearchFilter('custrecord_l54_es_nd', null, 'is', 'F');

	if (!isEmpty(subsidiaria))
		filters[3] = new nlobjSearchFilter('custrecord_l54_num_trans_subsidiaria', null, 'anyof', subsidiaria);

	var results = nlapiSearchRecord('customrecord_l54_numerador_transaccion', null, filters, columns);

	if (results != null && results.length > 0)
		return results[0].getValue('custrecord_l54_tipo_trans_l54');

	return null;
}

function getBocaPreferidaParaTrans(tipoTransId, subsidiaria, categoriaNumerador) {
	var i = 0;

	// obtengo la boca preferida para la letra seleccionada
	var filters = new Array();
	/*FDS4*/
	if (isEmpty(tipoTransId))
		return 1;
	/*FDS4*/

	filters[i++] = new nlobjSearchFilter('custrecord_l54_num_tipo_trans', null, 'anyof', tipoTransId);
	filters[i++] = new nlobjSearchFilter('custrecord_l54_num_fecha_inicio', null, 'onorbefore', 'today');
	filters[i++] = new nlobjSearchFilter('custrecord_l54_num_fecha_vencimiento', null, 'onorafter', 'today');
	filters[i++] = new nlobjSearchFilter('custrecord_l54_num_preferido', null, 'is', 'T');
	filters[i++] = new nlobjSearchFilter('isinactive', null, 'is', 'F');

	if (!isEmpty(subsidiaria))
		filters[i++] = new nlobjSearchFilter('custrecord_l54_num_subsidiaria', null, 'is', subsidiaria);

	//alert(categoriaNumerador);
	//PC-1

	//Si la empresa utiliza numeracion por location, filtro categoria de numerador
	if (getNumeracionxLocation()) {
		if (isEmpty(categoriaNumerador))
			categoriaNumerador = '@NONE@';
	} else
		categoriaNumerador = '@NONE@'; //Como la empresa no utiliza numerador por location, busco el numerador sin categoria

	filters[i++] = new nlobjSearchFilter('custrecord_l54_num_categoria_numerador', null, 'is', categoriaNumerador);
	//FIN PC-1

	var columns = [new nlobjSearchColumn("custrecord_l54_num_boca")];

	var results = new nlapiSearchRecord("customrecord_l54_numeradores", null, filters, columns);

	if (results != null && results.length > 0)
		return results[0].getValue('custrecord_l54_num_boca');

	return 1; // Boca default: 0001
}

function getNumeracionxLocation() {
	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		new nlobjSearchFilter('custrecord_l54_numeracion_location', null, 'is', 'T')];

	var searchresults = new nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, filters, null);

	if (searchresults != null && searchresults.length > 0)
		return true;
	else
		return false;
}


// Método que llama el onclick del botón 'Imprimir retenciones'
function imprimirRetencionesAuto(recId, infoVendorPayment) {

	nlapiLogExecution("DEBUG", 'imprimirRetencionesAuto', "OPEN. recId: " + recId+". JSON.stringify(infoVendorPayment): "+JSON.stringify(infoVendorPayment));

	if (!isEmpty(recId) || !isEmpty(infoVendorPayment)) {

		var esOneWorld            = esOneworld();
		var numerador_gan 		  = infoVendorPayment.ret_gan_numerador;
		var numerador_suss        = infoVendorPayment.ret_suss_numerador;
		var numerador_iva         = infoVendorPayment.ret_iva_numerador;
		var numerador_iibb        = infoVendorPayment.ret_iibb_numerador;
		var retencionesCalculadas = infoVendorPayment.ret_calculadas;
		var impRetIVA             = infoVendorPayment.iva_imp_a_retener;
		var impRetSUSS            = infoVendorPayment.suss_imp_a_retener;
		var impRetGAN             = infoVendorPayment.gan_imp_a_retener;
		var impRetIIBB            = infoVendorPayment.iibb_imp_a_retener;
		var versionProcesoCalcRet = infoVendorPayment.version_calc_ret;

		if (!isEmpty(versionProcesoCalcRet) && versionProcesoCalcRet == "2014")
			versionProcesoCalcRet = 1;
		else
			versionProcesoCalcRet = 0;

		var subsidiaria = ""
		if (esOneWorld) {
			subsidiaria = infoVendorPayment.subsidiaria;
			if (isEmpty(subsidiaria))
				subsidiaria = "";
		} else {
			subsidiaria = "";
		}
		nlapiLogExecution("DEBUG", 'imprimirRetencionesAuto', "versionProcesoCalcRet: "+versionProcesoCalcRet+". subsidiaria: "+subsidiaria);

		if (versionProcesoCalcRet == 1) {
			if (!isEmpty(retencionesCalculadas) && retencionesCalculadas == 'T'
				 && (!isEmpty(impRetIVA) && impRetIVA != 0.00
					 || !isEmpty(impRetSUSS) && impRetSUSS != 0.00
					 || !isEmpty(impRetGAN) && impRetGAN != 0.00
					 || !isEmpty(impRetIIBB) && impRetIIBB != 0.00)) {

				var objInformacionPago = new Array();
				var informacionPagoJson = JSON.stringify(infoVendorPayment);
				objInformacionPago['informacionPago'] = informacionPagoJson;

				var new_url = nlapiResolveURL('SUITELET', 'customscript_l54_ret_pdf_auto_masivo', 'customdeploy_l54_ret_pdf_auto_masivo',true);
				var response = nlapiRequestURL(new_url, objInformacionPago, null, null);
				//var new_url = nlapiResolveURL('SUITELET', 'customscript_l54_ret_pdf_auto_masivo', 'customdeploy_l54_ret_pdf_auto_masivo');
				
			} else {
				nlapiLogExecution("DEBUG", 'imprimirRetencionesAuto', "No es posible imprimir las retenciones debido a que el pago no tiene retenciones generadas. Por favor verifique y vuelva a intentar.");
				//alert('No es posible imprimir las retenciones debido a que el pago no tiene retenciones generadas. Por favor verifique y vuelva a intentar.');
			}
		} else {
			if (!isEmpty(numerador_gan) || !isEmpty(numerador_suss) || !isEmpty(numerador_iva) || !isEmpty(numerador_iibb)) {
				var new_url = nlapiResolveURL('SUITELET', 'customscript_l54_retencion_pdf', 'customdeploy1');
				//window.open(new_url + "&custparam_vendorpayment=" + recId + "&custparam_subsidiary=" + subsidiaria + "&custparam_version=" + versionProcesoCalcRet + "&custparam_grabarret=1");
			} else {
				//alert('No es posible imprimir las retenciones debido a que el pago no tiene retenciones generadas. Por favor verifique y vuelva a intentar.');
				nlapiLogExecution("DEBUG", 'imprimirRetencionesAuto', "No es posible imprimir las retenciones debido a que el pago no tiene retenciones generadas. Por favor verifique y vuelva a intentar.");
			}
		}
	} else
		//alert('Imposible realizar esta operación, debido a que las retenciones no fueron generadas.');
		nlapiLogExecution("DEBUG", 'imprimirRetencionesAuto', "Imposible realizar esta operación, debido a que las retenciones no fueron generadas.");
}
//Metodo que valida transaccion al tener un excepcion

function esEmpresaONG() {
	
	try {
		var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
						new nlobjSearchFilter('custrecord_l54_datos_imp_es_ong', null, 'is', 'T')];

		var searchresults = new nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, filters, null);

		if (searchresults != null && searchresults.length > 0)
			return true;
		else
			return false;
	} catch (e) {
		nlapiLogExecution('DEBUG', 'esONG()', 'Error - function esONG() - Error Exception: ' + e.message);
	}
}

function getDate(fecha, zonaHoraria){ //Toma una fecha ubicada en otra zona horaria y la mueve a GMT0. Con zonaHoraria se puede cambiar por otra diferente a GMT0
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