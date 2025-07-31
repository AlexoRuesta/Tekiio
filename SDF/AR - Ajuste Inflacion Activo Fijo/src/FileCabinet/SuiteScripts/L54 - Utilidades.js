
/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 */
define(["N/record", "N/error", "N/search"],
    function (record, error, search) {
        /* eslint-disable */
        function isEmpty(value) {
            if (value === '') {
                return true;
            }

            if (value === null) {
                return true;
            }

            if (value === undefined) {
                return true;
            }

            if (value === 'undefined') {
                return true;
            }

            if (value === 'null') {
                return true;
            }

            return false;
        }

        function l54esOneworld() {

            var proceso = 'l54esOneworld';

            try {
                var mySS = search.create({
                    type: 'customrecord_l54_datos_impositivos_emp',
                    columns: [{
                        name: 'internalid'
                    }]
                });

                var arraySearchParams = [];

                var objParam = new Object({});
                objParam.name = 'isinactive';
                objParam.operator = search.Operator.IS;
                objParam.values = ['F'];
                arraySearchParams.push(objParam);

                var objParam2 = new Object({});
                objParam2.name = 'custrecord_l54_es_oneworld';
                objParam2.operator = search.Operator.IS;
                objParam2.values = ['T'];
                arraySearchParams.push(objParam2);

                var filtro = '';

                for (var i = 0; i < arraySearchParams.length; i++) {
                    filtro = search.createFilter({
                        name: arraySearchParams[i].name,
                        operator: arraySearchParams[i].operator,
                        values: arraySearchParams[i].values
                    });
                    mySS.filters.push(filtro);
                }

                var searchResults = mySS.runPaged();

                if (searchResults != null && searchResults.count > 0)
                    return true;
                else
                    return false;
            } catch (error) {
                log.error(proceso, 'Error consultando si la empresa es one world - Detalles: ' + error.message);
                return false;
            }
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
                            if (value === true) {
                                value = "T";
                            } else if (value === false) {
                                value = "F";
                            }
                            value = [value];
                        }
                        var filtroID = '';
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
                } while (!isEmpty(resultado) && resultado.length > 0 && resultado.length == 1000)
                //} while (!isEmpty(resultado) && resultado.length > 0)
                objRsponseFunction = new Object();
                objRsponseFunction.result = completeResultSet;
                objRsponseFunction.search = resultSearch;
                var r = armarArreglosSS(completeResultSet, resultSearch);
                objRsponseFunction.array = r.array;
                objRespuesta.objRsponseFunction = objRsponseFunction;
            } catch (e) {
                objRespuesta.error = true;
                objRespuesta.tipoError = 'RORV007';
                objRespuesta.descripcion = 'function searchSavedPro: ' + e.message;
                log.error('RORV007', 'function searchSavedPro idSavedSearch=' + idSavedSearch + " error=" + + e.message);
                log.error('RORV007', JSON.stringify(e));
            }
            return objRespuesta;
        }

        function armarArreglosSS(resultSet, resultSearch) {
            var array = [];
            var respuesta = new Object({});
            respuesta.error = false;
            respuesta.msj = "";
            //log.debug('armarArreglosSS', 'resultSet: ' + JSON.stringify(resultSet));
            //log.debug('armarArreglosSS', 'resultSearch: ' + JSON.stringify(resultSearch));
            try {

                for (var i = 0; i < resultSet.length; i++) {
                    var obj = new Object({});
                    obj.indice = i;
                    for (var j = 0; j < resultSearch.columns.length; j++) {
                        var nombreColumna = resultSearch.columns[j].name;
                        //log.debug('armarArreglosSS','nombreColumna inicial: '+ nombreColumna);
                        if (nombreColumna.indexOf("formula") !== -1 || !isEmpty(resultSearch.columns[j].join)) {
                            nombreColumna = resultSearch.columns[j].label;

                            //if (nombreColumna.indexOf("Formula"))
                        }
                        //log.debug('armarArreglosSS','nombreColumna final: '+ nombreColumna);
                        if (Array.isArray(resultSet[i].getValue({ name: resultSearch.columns[j] }))) {
                            //log.debug('armarArreglosSS', 'resultSet[i].getValue({ name: nombreColumna }): ' + JSON.stringify(resultSet[i].getValue({ name: nombreColumna })));
                            var a = resultSet[i].getValue({ name: resultSearch.columns[j] });
                            //log.debug('armarArreglosSS', 'a: ' + JSON.stringify(a));
                            obj[nombreColumna] = a[0].value;
                        } else {
                            //log.debug('armarArreglosSS', 'resultSet[i].getValue({ name: nombreColumna }): ' + JSON.stringify(resultSet[i].getValue({ name: nombreColumna })));
                            obj[nombreColumna] = resultSet[i].getValue({ name: resultSearch.columns[j] });
                        }

                        /*else {

                            if (Array.isArray(resultSet[i].getValue({ name: nombreColumna }))) {
                                //log.debug('armarArreglosSS', 'resultSet[i].getValue({ name: nombreColumna }): ' + JSON.stringify(resultSet[i].getValue({ name: nombreColumna })));
                                var a = resultSet[i].getValue({ name: nombreColumna });
                                //log.debug('armarArreglosSS', 'a: ' + JSON.stringify(a));
                                obj[nombreColumna] = a[0].value;
                            } else {
                                //log.debug('armarArreglosSS', 'resultSet[i].getValue({ name: nombreColumna }): ' + JSON.stringify(resultSet[i].getValue({ name: nombreColumna })));
                                obj[nombreColumna] = resultSet[i].getValue({ name: nombreColumna });
                            }
                        }*/
                    }
                    //log.debug('armarArreglosSS', 'obj: ' + JSON.stringify(obj));
                    array.push(obj);
                }
                //log.debug('armarArreglosSS', 'arrayArmado cantidad: ' + array.length);
                respuesta.array = array;

            } catch (e) {
                respuesta.error = true;
                respuesta.tipoError = "RARR001";
                respuesta.msj = "Excepción: " + e;
                log.error('RARR001', 'armarArreglosSS Excepción: ' + e);
            }

            return respuesta;
        }

        function operadorBusqueda(operadorString) {
            var operator = '';
            switch (operadorString) {

                case 'IS':
                    operator = search.Operator.IS;
                    break;

                case 'AFTER':
                    operator = search.Operator.AFTER;
                    break;

                case 'ALLOF':
                    operator = search.Operator.ALLOF;
                    break;

                case 'ANY':
                    operator = search.Operator.ANY;
                    break;
                case 'ANYOF':
                    operator = search.Operator.ANYOF;
                    break;

                case 'BEFORE':
                    operator = search.Operator.BEFORE;
                    break;

                case 'BETWEEN':
                    operator = search.Operator.BETWEEN;
                    break;

                case 'CONTAINS':
                    operator = search.Operator.CONTAINS;
                    break;

                case 'DOESNOTCONTAIN':
                    operator = search.Operator.DOESNOTCONTAIN;
                    break;

                case 'DOESNOTSTARTWITH':
                    operator = search.Operator.DOESNOTSTARTWITH;
                    break;

                case 'EQUALTO':
                    operator = search.Operator.EQUALTO;
                    break;

                case 'GREATERTHAN':
                    operator = search.Operator.GREATERTHAN;
                    break;

                case 'GREATERTHANOREQUALTO':
                    operator = search.Operator.GREATERTHANOREQUALTO;
                    break;

                case 'HASKEYWORDS':
                    operator = search.Operator.HASKEYWORDS;
                    break;

                case 'ISEMPTY':
                    operator = search.Operator.ISEMPTY;
                    break;

                case 'ISNOT':
                    operator = search.Operator.ISNOT;
                    break;

                case 'ISNOTEMPTY':
                    operator = search.Operator.ISNOTEMPTY;
                    break;

                case 'LESSTHAN':
                    operator = search.Operator.LESSTHAN;
                    break;

                case 'LESSTHANOREQUALTO':
                    operator = search.Operator.LESSTHANOREQUALTO;
                    break;

                case 'NONEOF':
                    operator = search.Operator.NONEOF;
                    break;

                case 'NOTAFTER':
                    operator = search.Operator.NOTAFTER;
                    break;

                case 'NOTALLOF':
                    operator = search.Operator.NOTALLOF;
                    break;

                case 'NOTBEFORE':
                    operator = search.Operator.NOTBEFORE;
                    break;

                case 'NOTBETWEEN':
                    operator = search.Operator.NOTBETWEEN;
                    break;

                case 'NOTEQUALTO':
                    operator = search.Operator.NOTEQUALTO;
                    break;

                case 'NOTGREATERTHAN':
                    operator = search.Operator.NOTGREATERTHAN;
                    break;

                case 'NOTGREATERTHANOREQUALTO':
                    operator = search.Operator.NOTGREATERTHANOREQUALTO;
                    break;

                case 'NOTLESSTHAN':
                    operator = search.Operator.NOTLESSTHAN;
                    break;

                case 'NOTLESSTHANOREQUALTO':
                    operator = search.Operator.NOTLESSTHANOREQUALTO;
                    break;

                case 'NOTON':
                    operator = search.Operator.NOTON;
                    break;

                case 'NOTONORAFTER':
                    operator = search.Operator.NOTONORAFTER;
                    break;

                case 'NOTONORBEFORE':
                    operator = search.Operator.NOTONORBEFORE;
                    break;

                case 'NOTWITHIN':
                    operator = search.Operator.NOTWITHIN;
                    break;

                case 'ON':
                    operator = search.Operator.ON;
                    break;

                case 'ONORAFTER':
                    operator = search.Operator.ONORAFTER;
                    break;

                case 'ONORBEFORE':
                    operator = search.Operator.ONORBEFORE;
                    break;

                case 'STARTSWITH':
                    operator = search.Operator.STARTSWITH;
                    break;

                case 'WITHIN':
                    operator = search.Operator.WITHIN;
                    break;
            }
            return operator;
        }

        function getNumeroEnLetras(numero, subsidiaria) {

            var proceso = 'getNumeroEnLetras';
            try {
                var filters = [];
                filters[0] = search.createFilter({
                    name: 'isinactive',
                    operator: search.Operator.IS,
                    values: 'F'
                });

                if (!isEmpty(subsidiaria)) {
                    filters[1] = search.createFilter({
                        name: 'custrecord_l54_subsidiaria',
                        operator: search.Operator.ANYOF,
                        values: subsidiaria
                    });
                }

                var results = search.create({
                    type: 'customrecord_l54_datos_impositivos_emp',
                    columns: ['custrecord_usar_decimales_monto_escrito'],
                    filters: filters
                }).run().getRange({
                    start: 0,
                    end: 1
                });

                var usarDecimales = null;
                if (results != null && results.length > 0) {
                    // usarDecimales = searchResults[0].getValue({ name: 'custrecord_usar_decimales_monto_escrito' });
                    usarDecimales = results[0].getValue('custrecord_usar_decimales_monto_escrito');
                }

                log.debug(proceso, 'usarDecimales: ' + usarDecimales);

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

                        var partes = String(numero).split('.');
                        var parteEntera = partes[0];
                        var parteDecimal = partes[1];
                        if (parteDecimal == undefined) {
                            parteDecimal = "00";
                        } else if (parteDecimal.length == 1) {
                            parteDecimal = parteDecimal + "0";
                        }
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
                } else {
                    log.error(proceso, 'Error al obtener el monto escrito - No se recibió ningún monto para transformar a letras.');
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción getNumeroEnLetras - Detalles: ' + error.message);
            }

            return null;
        }

        function getNumberLiteral(n) {

            var proceso = 'getNumberLiteral';

            try {
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

            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción getNumberLiteral - Detalles: ' + error.message);
            }

            return "NO DISPONIBLE";
        }

        function letras(c, d, u) {

            var proceso = 'letras';

            try {
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
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción letras - Detalles: ' + error.message);
            }

            return null;
        }

        function getTipoTransId(tipoTransStr) {

            var proceso = 'getTipoTransId';

            try {
                if (!isEmpty(tipoTransStr)) {

                    var filters = [];
                    filters[0] = search.createFilter({
                        name: 'name',
                        operator: search.Operator.IS,
                        values: tipoTransStr
                    });

                    var results = search.create({
                        type: 'customlist_l54_tipo_transaccion',
                        columns: ['internalId'],
                        filters: filters
                    }).run().getRange({
                        start: 0,
                        end: 1
                    });

                    // log.debug('getTipoTransId', 'Result SS getTipoTransId: ' + JSON.stringify(results));

                    if (results != null && results.length > 0) {
                        return results[0].getValue('internalId');
                    } else {
                        log.error(proceso, 'No se encontró ningún resultado para el tipo de transacción recibido.');
                        return null;
                    }
                } else {
                    log.error(proceso, 'Error al obtener el ID del tipo de transacción de la lista "Listado de Tipo transacción" - No se recibió ningún tipo de transacción');
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción getTipoTransId - Detalles: ' + error.message);
            }

            return null;
        }

        function numeradorAUtilizarSS(tipoTransNetSuite, esND, subsidiaria) {

            var proceso = 'numeradorAUtilizarSS';
            log.debug(proceso, 'INICIO - numeradorAUtilizarSS');
            // log.debug(proceso, 'log de control 1 - tipoTransNetSuite: ' + tipoTransNetSuite + ' - esND: ' + esND + ' - subsidiaria: ' + subsidiaria);
            try {
                // log.debug(proceso, 'log de control 2');
                if (!isEmpty(tipoTransNetSuite)) {
                    // log.debug(proceso, 'log de control 3');

                    var arraySearchParams = [];
                    // log.debug(proceso, 'log de control 4');

                    var objParam = {};
                    objParam.name = 'isinactive';
                    objParam.operator = search.Operator.IS;
                    objParam.values = 'F';

                    arraySearchParams.push(objParam);

                    log.debug(proceso, 'log de control 5');

                    var objParam2 = {};
                    objParam2.name = 'custrecord_l54_tipo_trans_netsuite';
                    objParam2.operator = search.Operator.IS;
                    objParam2.values = tipoTransNetSuite;
                    arraySearchParams.push(objParam2);

                    var esNotaDebitoFinal = !isEmpty(esND) ? esND : 'F'

                    var objParam3 = {};
                    objParam3.name = 'custrecord_l54_es_nd';
                    objParam3.operator = search.Operator.IS;
                    objParam3.values = esNotaDebitoFinal;
                    arraySearchParams.push(objParam3);

                    // log.debug(proceso, 'log de control 7');

                    if (!isEmpty(subsidiaria)) {
                        var objParam4 = {};
                        objParam4.name = 'custrecord_l54_num_trans_subsidiaria';
                        objParam4.operator = search.Operator.ANYOF;
                        objParam4.values = subsidiaria;
                        arraySearchParams.push(objParam4);
                    }

                    var filtro = '';
                    var filters = [];

                    for (var i = 0; i < arraySearchParams.length; i++) {
                        filtro = search.createFilter({
                            name: arraySearchParams[i].name,
                            operator: arraySearchParams[i].operator,
                            values: arraySearchParams[i].values
                        });
                        // mySS.filters.push(filtro);
                        filters.push(filtro);
                    }
                    var mySS = search.create({
                        type: 'customrecord_l54_numerador_transaccion',
                        columns: ['internalid', 'custrecord_l54_tipo_trans_l54'],
                        filters: filters
                    });
                    log.debug(proceso, 'log de control 8 - mySS: ' + JSON.stringify(mySS));
                    var searchResults = mySS.run().getRange({
                        start: 0,
                        end: 1
                    });

                    log.debug(proceso, 'Resultado de numeradores, tipo transacción L54: ' + JSON.stringify(searchResults));
                    // var objResultSet = searchSavedPro('customsearch_l54_num_trans_num_utilizar', filtros);

                    if (!isEmpty(searchResults) && searchResults.length > 0) {
                        var tipoTransId = searchResults[0].getValue('custrecord_l54_tipo_trans_l54');
                        return tipoTransId;
                    } else {
                        log.error(proceso, 'No se encontró ningún resultado de numerador para los datos recibidos por parámetros - tipoTransNetSuite: ' + tipoTransNetSuite + ' - esND: ' + esND + ' - subsidiaria: ' + subsidiaria);
                        return null;
                    }
                } else {
                    log.error(proceso, 'Error al obtener el numerador a utilizar - No se recibió ningún tipo de transacción por parámetro.');
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción numeradorAUtilizarSS - Detalles: ' + error.message);
            }
            log.debug(proceso, 'FIN - numeradorAUtilizarSS');
            return null;
        }

        function devolverNuevoNumero(tipoTransId, boca, letra, subsidiaria, jurisdiccion, esLiquidoProducto, esCreditoElectronico, esConsultaNumerador) {

            var proceso = 'devolverNuevoNumero';

            try {
                log.debug(proceso, 'INICIO devolverNuevoNumero - Parámetros - tipoTransId: ' + tipoTransId + ' - boca: ' + boca + ' - letra: ' + letra + ' - subsidiaria: ' + subsidiaria + ' - jurisdiccion: ' + jurisdiccion + ' - esLiquidoProducto: ' + esLiquidoProducto + ' - esCreditoElectronico: ' + esCreditoElectronico + ' - esConsultaNumerador: ' + esConsultaNumerador);

                var numeradorElectronico = false;
                var tipoMiddleware = '';
                var tipoTransaccionAFIP = "";
                var idInternoNumerador = "";
                var idTransaccionAFIP = "";
                var numeradorPrefijo = "";
                var numeradorLong = "";
                var numeradorInicial = "";
                var numerador = "";
                var numeradorArray = new Array();

                if (!isEmpty(tipoTransId) && !isEmpty(boca) && !isEmpty(letra)) {

                    var filtros = [];

                    //FILTRO TIPO TRANSACCION
                    if (!isEmpty(tipoTransId)) {
                        var filtro1 = {
                            name: 'custrecord_l54_num_tipo_trans',
                            operator: 'ANYOF',
                            values: tipoTransId
                        };
                        filtros.push(filtro1);
                    }

                    //FILTRO BOCA
                    if (!isEmpty(boca)) {
                        var filtro2 = {
                            name: 'custrecord_l54_num_boca',
                            operator: 'ANYOF',
                            values: boca
                        };
                        filtros.push(filtro2);
                    }

                    //FILTRO LETRA
                    if (!isEmpty(letra)) {
                        var filtro3 = {
                            name: 'custrecord_l54_num_letra',
                            operator: 'ANYOF',
                            values: letra
                        };
                        filtros.push(filtro3);
                    }

                    //FILTRO SUBSIDIARIA
                    if (!isEmpty(subsidiaria)) {
                        var filtro4 = {
                            name: 'custrecord_l54_num_subsidiaria',
                            operator: 'ANYOF',
                            values: subsidiaria
                        };
                        filtros.push(filtro4);
                    }

                    //FILTRO JURISDICCION
                    if (!isEmpty(jurisdiccion)) {
                        var filtro5 = {
                            name: 'custrecord_l54_num_jurisdiccion',
                            operator: 'IS',
                            values: jurisdiccion
                        };
                        filtros.push(filtro5);
                    }

                    //FILTRO ES LÍQUIDO PRODUCTO
                    if (!isEmpty(esLiquidoProducto)) {
                        var filtro6 = {
                            name: 'custrecord_l54_num_liquido_producto',
                            operator: 'IS',
                            values: esLiquidoProducto
                        };
                        filtros.push(filtro6);
                    }

                    //FILTRO ES CRÉDITO ELECTRÓNICO
                    if (!isEmpty(esCreditoElectronico)) {
                        var filtro7 = {
                            name: 'custrecord_l54_num_credito_electronico',
                            operator: 'IS',
                            values: esCreditoElectronico
                        };
                        filtros.push(filtro7);
                    }

                    var objResultSet = searchSavedPro('customsearch_l54_numeradores_num_util', filtros);

                    if (!objResultSet.error) {

                        var resultSet = objResultSet.objRsponseFunction.result;
                        var resultSearch = objResultSet.objRsponseFunction.search;

                        if (!isEmpty(resultSet) && resultSet.length > 0) {
                            numerador = resultSet[0].getValue({ name: resultSearch.columns[1] });
                            numeradorInicial = resultSet[0].getValue({ name: resultSearch.columns[2] });
                            numeradorLong = resultSet[0].getValue({ name: resultSearch.columns[3] });
                            numeradorPrefijo = resultSet[0].getValue({ name: resultSearch.columns[4] });
                            numeradorElectronico = resultSet[0].getValue({ name: resultSearch.columns[5] });
                            tipoMiddleware = resultSet[0].getValue({ name: resultSearch.columns[6] });
                            tipoTransaccionAFIP = resultSet[0].getValue({ name: resultSearch.columns[7] });
                            idInternoNumerador = resultSet[0].getValue({ name: resultSearch.columns[8] });
                            var recId = idInternoNumerador;
                            idTransaccionAFIP = resultSet[0].getValue({ name: resultSearch.columns[9] });
                        } else {
                            log.error(proceso, 'No se encontró ningún resultado del RT numeradores para los datos recibidos por parámetros - tipoTransId: ' + tipoTransId + ' - boca: ' + boca + ' - letra: ' + letra + ' - subsidiaria: ' + subsidiaria + ' - jurisdiccion: ' + jurisdiccion + ' - esLiquidoProducto: ' + esLiquidoProducto + ' - esCreditoElectronico: ' + esCreditoElectronico);
                            return null;
                        }
                    } else {
                        log.error(proceso, 'Error intentando obtener información del SS: "L54 - Numeradores (Numerador a Utilizar)" - Detalles: ' + objResultSet.descripcion);
                        return null;
                    }

                    if (!isEmpty(numeradorElectronico) && (numeradorElectronico == 'T' || numeradorElectronico == true)) {
                        // Si es Numerador Electronico
                        numeradorArray['referencia'] = idInternoNumerador;
                        numeradorArray['numerador'] = ""; // numerador
                        numeradorArray['numeradorPrefijo'] = ""; // prefijo + numerador
                        numeradorArray['numeradorElectronico'] = 'T';
                        numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
                        numeradorArray['idTransaccionAFIP'] = idTransaccionAFIP;
                        log.debug(proceso, 'RETURN - numeradorArray: ' + JSON.stringify(numeradorArray));
                        return numeradorArray;
                    } else {
                        /* Si se llama a la función para consultar numerador no se ingresa acá.
                        Si es para generar un nuevo número (no es consulta), ingresa acá. */
                        if (!esConsultaNumerador) {
                            if (isEmpty(numerador)) {
                                var contador = parseInt(numeradorInicial) + 1;

                                record.submitFields({
                                    type: 'customrecord_l54_numeradores',
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
                            } else {
                                //nlapiSubmitField('customrecord_l54_numeradores', recId, ['custrecord_l54_num_numerador'], [parseInt(numerador) + 1]);
                                var contador = parseInt(numerador) + 1;
                                record.submitFields({
                                    type: 'customrecord_l54_numeradores',
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
                        }

                        if (!isEmpty(numeradorPrefijo)) {
                            var numeradorArray = new Array();
                            numeradorArray['referencia'] = idInternoNumerador;
                            numeradorArray['numerador'] = numerador.toString(); // numerador
                            numeradorArray['numeradorPrefijo'] = numeradorPrefijo.toString() + numerador.toString(); // prefijo + numerador
                            numeradorArray['numeradorElectronico'] = 'F';
                            numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
                            numeradorArray['idTransaccionAFIP'] = idTransaccionAFIP;
                            log.debug(proceso, 'RETURN - numeradorArray: ' + JSON.stringify(numeradorArray));
                            return numeradorArray;
                        } else {
                            var numeradorArray = new Array();
                            numeradorArray['referencia'] = idInternoNumerador;
                            numeradorArray['numerador'] = numerador.toString(); // numerador
                            numeradorArray['numeradorPrefijo'] = numerador.toString(); // prefijo + numerador
                            numeradorArray['numeradorElectronico'] = 'F';
                            numeradorArray['tipoTransAFIP'] = tipoTransaccionAFIP;
                            numeradorArray['idTransaccionAFIP'] = idTransaccionAFIP;
                            log.debug(proceso, 'RETURN - numeradorArray: ' + JSON.stringify(numeradorArray));
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
                    numeradorArray['idTransaccionAFIP'] = "";
                    log.debug(proceso, 'RETURN - numeradorArray: ' + JSON.stringify(numeradorArray));
                    return numeradorArray;
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción devolverNuevoNumero - Detalles: ' + error.message);
            }

            return null;
        }

        function getValueFromList(list, key) {

            var proceso = 'getValueFromList';

            try {
                if (!isEmpty(list) && !isEmpty(key)) {
                    var filters = new Array();
                    var filters = [];
                    filters[0] = search.createFilter({
                        name: 'name',
                        operator: search.Operator.IS,
                        values: key
                    });

                    var results = search.create({
                        type: list,
                        columns: ['internalId'],
                        filters: filters
                    }).run().getRange({
                        start: 0,
                        end: 1
                    });

                    log.debug('getTipoTransId', 'Result SS get value from list ' + JSON.stringify(results));

                    if (results != null && results.length > 0) {
                        return results[0].getValue('internalId');
                    } else {
                        log.error(proceso, 'No se encontró ningún resultado para la lista recibida por parámetros: ' + list);
                        return null;
                    }
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción - getValueFromList - Detalles: ' + error.message);
                return null;
            }
        }

        function zeroFill(number, width) {

            width -= number.toString().length;
            if (width > 0) {

                return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
            }

            return number;
        }

        function obtenerIDMoneda(monedaId) {

            var proceso = 'obtenerIDMoneda';
            var response = { idMonedaAFIP: '', codigoMonedaAFIP: '' };
            try {
                if (!isEmpty(monedaId)) {
                    var filtros = [];

                    filtros[0] = search.createFilter({
                        name: 'isinactive',
                        operator: search.Operator.IS,
                        values: 'F'
                    });

                    filtros[1] = search.createFilter({
                        name: 'custrecord_l54_moneda',
                        operator: search.Operator.IS,
                        values: monedaId
                    });

                    var results = search.create({
                        type: 'customrecord_l54_monedas_fex',
                        columns: ['internalid', 'custrecord_l54_cod_moneda_fex'],
                        filters: filtros
                    }).run().getRange({
                        start: 0,
                        end: 1
                    });

                    log.debug(proceso, 'Result SS ' + JSON.stringify(results));

                    if (results != null && results.length > 0) {
                        response.idMonedaAFIP = results[0].getValue('internalid');
                        response.codigoMonedaAFIP = results[0].getValue('custrecord_l54_cod_moneda_fex');
                        return response;
                    } else {
                        log.error(proceso, 'No se encontró ningún resultado para el ID de moneda recibido.');
                        return null;
                    }
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción obtenerIDMoneda - Detalles: ' + error.message);
            }
            return null;
        }

        function obtenerPuntoVenta(esND, subsidiaria, tipoTransStr, locationId) {

            var proceso = "obtenerPuntoVenta";
            var bocaPreferida = '';

            try {
                log.debug(proceso, 'INICIO - obtenerPuntoVenta');

                var tipoTransId = numeradorAUtilizarSS(tipoTransStr, esND, subsidiaria);
                log.debug(proceso, 'tipoTransId: ' + tipoTransId);
                var categoriaNumerador = null;

                if (!isEmpty(locationId)) {
                    var fieldLookUp = search.lookupFields({
                        type: search.Type.LOCATION,
                        id: locationId,
                        columns: ['custrecord_l54_loc_categoria_numerador']
                    });

                    log.debug(proceso, 'categoría numerador: ' + JSON.stringify(fieldLookUp));

                    if (!isEmpty(fieldLookUp) && fieldLookUp.custrecord_l54_loc_categoria_numerador != undefined && fieldLookUp.custrecord_l54_loc_categoria_numerador[0] != undefined) {
                        categoriaNumerador = fieldLookUp.custrecord_l54_loc_categoria_numerador[0].value;
                    }
                }

                bocaPreferida = getBocaPreferidaParaTrans(tipoTransId, subsidiaria, categoriaNumerador);
                log.debug(proceso, 'FIN - obtenerPuntoVenta - bocaPreferida: ' + bocaPreferida);
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción obtenerPuntoVenta - Detalles: ' + error.message);
            }
            return bocaPreferida;
        }

        function getBocaPreferidaParaTrans(tipoTransId, subsidiaria, categoriaNumerador) {

            var proceso = 'getBocaPreferidaParaTrans';
            var boca = 1; // Boca default: 0001

            try {
                log.debug(proceso, 'INICIO - getBocaPreferidaParaTrans - Parámetros - tipoTransId: ' + tipoTransId + ' - subsidiaria: ' + subsidiaria + ' - categoriaNumerador: ' + categoriaNumerador);
                var i = 0;
                var filtros = [];

                if (isEmpty(tipoTransId)) {
                    log.error(proceso, 'LINE 1166 - No existe valor para la variable tipoTransId, se retorna por defecto la boca con ID 1.');
                    return boca;
                }

                if (!isEmpty(tipoTransId)) {
                    var filtro1 = {
                        name: 'custrecord_l54_num_tipo_trans',
                        operator: 'ANYOF',
                        values: tipoTransId
                    };
                    filtros.push(filtro1);
                }

                //FILTRO SUBSIDIARIA
                if (!isEmpty(subsidiaria)) {
                    var filtro2 = {
                        name: 'custrecord_l54_num_subsidiaria',
                        operator: 'ANYOF',
                        values: subsidiaria
                    };
                    filtros.push(filtro2);
                }

                //FILTRO PREFERIDO
                var filtro3 = {
                    name: 'custrecord_l54_num_preferido',
                    operator: 'IS',
                    values: true
                };

                filtros.push(filtro3);

                var numXLocation = getNumeracionxLocation(subsidiaria);
                //log.debug('getBocaPreferidaParaTrans','LINE 3618 - numXLocation: '+numXLocation);

                //Si la empresa utiliza numeracion por location, filtro categoria de numerador
                if (numXLocation) {
                    if (isEmpty(categoriaNumerador)) {
                        categoriaNumerador = '@NONE@';
                    }
                } else {
                    categoriaNumerador = '@NONE@'; //Como la empresa no utiliza numerador por location, busco el numerador sin categoria
                }

                //FILTRO CATEGORIA NUMERADOR
                if (!isEmpty(categoriaNumerador)) {
                    var filtro4 = {
                        name: 'custrecord_l54_num_categoria_numerador',
                        operator: 'IS',
                        values: categoriaNumerador
                    };
                    filtros.push(filtro4);
                }

                var objResultSet = searchSavedPro('customsearch_l54_numeradores_num_util', filtros);

                if (!objResultSet.error) {

                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;

                    if (!isEmpty(resultSet) && resultSet.length > 0) {
                        var idInternoNumerador = resultSet[0].getValue({ name: resultSearch.columns[8] });
                        boca = resultSet[0].getValue({ name: resultSearch.columns[0] });
                        log.debug(proceso, 'idInternoNumerador: ' + idInternoNumerador + ' - boca: ' + boca);
                    } else {
                        log.error(proceso, 'No se encontró ningún resultado del RT numeradores para los datos recibidos por parámetros - tipoTransId: ' + tipoTransId + ' - subsidiaria: ' + subsidiaria + ' - categoriaNumerador: ' + categoriaNumerador);
                    }
                } else {
                    log.error(proceso, 'Error intentando obtener información del SS: "L54 - Numeradores (Numerador a Utilizar)" - Detalles: ' + objResultSet.descripcion);
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción getBocaPreferidaParaTrans - Detalles: ' + error.message);
            }
            return boca;
        }

        function getNumeracionxLocation(subsidiaria) {

            var proceso = 'getNumeracionxLocation';
            var numeradorLocacion = false;

            try {
                log.debug(proceso, 'INICIO - getNumeracionxLocation');
                var filtros = [];
                var i = 0;

                filtros[i++] = search.createFilter({
                    name: 'isinactive',
                    operator: search.Operator.IS,
                    values: 'F'
                });

                filtros[i++] = search.createFilter({
                    name: 'custrecord_l54_numeracion_location',
                    operator: search.Operator.IS,
                    values: 'T'
                });

                if (!isEmpty(subsidiaria)) {
                    filtros[i++] = search.createFilter({
                        name: 'custrecord_l54_subsidiaria',
                        operator: search.Operator.ANYOF,
                        values: subsidiaria
                    });
                }

                var results = search.create({
                    type: 'customrecord_l54_datos_impositivos_emp',
                    columns: ['internalid'],
                    filters: filtros
                }).run().getRange({
                    start: 0,
                    end: 1
                });

                log.debug(proceso, 'Result SS: ' + JSON.stringify(results));

                numeradorLocacion = (!isEmpty(results) && results.length > 0) ? true : false;
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción getNumeracionxLocation - Detalles: ' + error.message);
            }
            log.debug(proceso, 'FIN - getNumeracionxLocation - numeradorLocacion: ' + numeradorLocacion);
            return numeradorLocacion;
        }

        function validarNumerador(tipoTransId, boca, letra, subsidiaria, jurisdiccion, esLiquidoProducto, esCreditoElectronico) {

            var proceso = 'validarNumerador';
            var response = { error: false, mensaje: '', caiValue: '', caiVencimiento: '' };

            try {
                log.debug(proceso, 'INICIO validarNumerador - tipoTransId: ' + tipoTransId + ' - boca: ' + boca + ' - letra: ' + letra + ' - subsidiaria: ' + subsidiaria + ' - jurisdiccion: ' + jurisdiccion + ' - esLiquidoProducto: ' + esLiquidoProducto + ' - esCreditoElectronico: ' + esCreditoElectronico);

                if (isEmpty(boca) || isEmpty(letra)) {
                    return response;
                }

                var filtros = [];

                //FILTRO TIPO TRANSACCION
                if (!isEmpty(tipoTransId)) {
                    var filtro1 = {
                        name: 'custrecord_l54_num_tipo_trans',
                        operator: 'ANYOF',
                        values: tipoTransId
                    };
                    filtros.push(filtro1);
                }

                //FILTRO BOCA
                if (!isEmpty(boca)) {
                    var filtro2 = {
                        name: 'custrecord_l54_num_boca',
                        operator: 'ANYOF',
                        values: boca
                    };
                    filtros.push(filtro2);
                }

                //FILTRO LETRA
                if (!isEmpty(letra)) {
                    var filtro3 = {
                        name: 'custrecord_l54_num_letra',
                        operator: 'ANYOF',
                        values: letra
                    };
                    filtros.push(filtro3);
                }

                //FILTRO SUBSIDIARIA
                if (!isEmpty(subsidiaria)) {
                    var filtro4 = {
                        name: 'custrecord_l54_num_subsidiaria',
                        operator: 'ANYOF',
                        values: subsidiaria
                    };
                    filtros.push(filtro4);
                }

                //FILTRO JURISDICCION
                if (!isEmpty(jurisdiccion)) {
                    var filtro5 = {
                        name: 'custrecord_l54_num_jurisdiccion',
                        operator: 'IS',
                        values: jurisdiccion
                    };
                    filtros.push(filtro5);
                }

                //FILTRO ES LÍQUIDO PRODUCTO
                if (!isEmpty(esLiquidoProducto)) {
                    var filtro6 = {
                        name: 'custrecord_l54_num_liquido_producto',
                        operator: 'IS',
                        values: esLiquidoProducto
                    };
                    filtros.push(filtro6);
                }

                //FILTRO ES CRÉDITO ELECTRÓNICO
                if (!isEmpty(esCreditoElectronico)) {
                    var filtro7 = {
                        name: 'custrecord_l54_num_credito_electronico',
                        operator: 'IS',
                        values: esCreditoElectronico
                    };
                    filtros.push(filtro7);
                }

                var objResultSet = searchSavedPro('customsearch_l54_numeradores_num_util', filtros);

                if (!objResultSet.error) {

                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;

                    if (!isEmpty(resultSet) && resultSet.length > 0) {
                        var idInternoNumerador = resultSet[0].getValue({ name: resultSearch.columns[8] });
                        var idTransaccionAFIP = resultSet[0].getValue({ name: resultSearch.columns[9] });
                        response.caiValue = resultSet[0].getValue({ name: resultSearch.columns[10] });
                        response.caiVencimiento = resultSet[0].getValue({ name: resultSearch.columns[11] });
                    } else {
                        if (isEmpty(jurisdiccion)) {
                            response.error = true;
                            response.mensaje = 'No se encuentra configurado correctamente el Numerador. Verifique el panel de Administración. Muchas gracias.';
                            log.error(proceso, response.mensaje);
                        }
                    }
                } else {
                    response.error = true;
                    response.mensaje = 'Error intentando obtener información del SS: "L54 - Numeradores (Numerador a Utilizar)" - Detalles: ' + objResultSet.descripcion;
                    log.error(proceso, response.mensaje);
                }
            } catch (error) {
                response.error = true;
                response.mensaje = 'Error NetSuite Excepción - validarNumerador - Detalles: ' + error.message;
                log.error(proceso, response.mensaje);
            }
            return response;
        }

        function existenciaTransaccion(tipoTransId, recId, numeroLocalizado) { // agregar parametro subsidiaria

            var proceso = 'existenciaTransaccion';
            var response = { error: false, existeTransaccion: false, mensaje: '' };

            try {
                if (tipoTransId == 1)
                    tipoTransStr = 'CustCred'; // credit memo
                else if (tipoTransId == 2 || tipoTransId == 10)
                    tipoTransStr = 'CustInvc'; // invoice or credit debit
                else if (tipoTransId == 3)
                    tipoTransStr = 'ItemShip'; // itemfulfillment
                else if (tipoTransId == 4)
                    tipoTransStr = 'VendPymt'; // vendorpayment
                else if (tipoTransId == 5)
                    tipoTransStr = 'CustPymt'; // customerpayment
                else if (tipoTransId == 8)
                    tipoTransStr = 'Check'; // check
                else if (tipoTransId == 16)
                    tipoTransStr = 'CashSale'; // cashsale

                var filtros = [];
                var i = 0;

                if (!isEmpty(tipoTransStr)) {
                    filtros[i++] = search.createFilter({
                        name: 'type',
                        operator: search.Operator.ANYOF,
                        values: [tipoTransStr]
                    });
                }

                if (!isEmpty(numeroLocalizado)) {
                    filtros[i++] = search.createFilter({
                        name: 'custbody_l54_numero_localizado',
                        operator: search.Operator.IS,
                        values: numeroLocalizado
                    });
                }

                filtros[i++] = search.createFilter({
                    name: 'mainline',
                    operator: search.Operator.IS,
                    values: 'T'
                });

                // si es Nota de Debito
                var esND = (tipoTransId == 10) ? 'T' : 'F';
                filtros[i++] = search.createFilter({
                    name: 'custbody_l54_nd',
                    operator: search.Operator.IS,
                    values: esND
                });

                if (!isEmpty(recId)) {
                    filtros[i++] = search.createFilter({
                        name: 'internalid',
                        operator: search.Operator.NONEOF,
                        values: recId
                    });
                }

                // Comentado desde la versión 1.0 del script, no se consulta por subsidiaria para verificar el numerador
                /* if (!isEmpty(subsidiaria)) {
                    var filtro6 = {
                        name: 'subsidiary',
                        operator: search.Operator.ANYOF,
                        values: subsidiaria
                    }
                    filtros.push(filtro6);
                } */

                var results = search.create({
                    type: search.Type.TRANSACTION,
                    columns: ['internalid'],
                    filters: filtros
                }).run().getRange({
                    start: 0,
                    end: 1
                });

                log.debug(proceso, 'Result SS: ' + JSON.stringify(results));

                if (!isEmpty(results) && results.length > 0) {
                    response.existeTransaccion = true;
                }
            } catch (error) {
                response.error = true;
                response.mensaje = 'Error NetSuite Excepción - existenciaTransaccion - Detalles: ' + error.message;
                log.error(proceso, response.mensaje);
            }
        }

        function devolverPrefijo(tipoTransId, boca, letra, subsidiaria, esLiquidoProducto, esCreditoElectronico) {

            var proceso = 'devolverPrefijo';
            var numeradorPrefijo = '';

            try {
                log.debug(proceso, 'INICIO devolverPrefijo - tipoTransId: ' + tipoTransId + ' - boca: ' + boca + ' - letra: ' + letra + ' - subsidiaria: ' + subsidiaria + ' - esLiquidoProducto: ' + esLiquidoProducto + ' - esCreditoElectronico: ' + esCreditoElectronico);

                if (isEmpty(boca) || isEmpty(letra)) {
                    return response;
                }

                var filtros = [];

                //FILTRO TIPO TRANSACCION
                if (!isEmpty(tipoTransId)) {
                    var filtro1 = {
                        name: 'custrecord_l54_num_tipo_trans',
                        operator: 'ANYOF',
                        values: tipoTransId
                    };
                    filtros.push(filtro1);
                }

                //FILTRO BOCA
                if (!isEmpty(boca)) {
                    var filtro2 = {
                        name: 'custrecord_l54_num_boca',
                        operator: 'ANYOF',
                        values: boca
                    };
                    filtros.push(filtro2);
                }

                //FILTRO LETRA
                if (!isEmpty(letra)) {
                    var filtro3 = {
                        name: 'custrecord_l54_num_letra',
                        operator: 'ANYOF',
                        values: letra
                    };
                    filtros.push(filtro3);
                }

                //FILTRO SUBSIDIARIA
                if (!isEmpty(subsidiaria)) {
                    var filtro4 = {
                        name: 'custrecord_l54_num_subsidiaria',
                        operator: 'ANYOF',
                        values: subsidiaria
                    };
                    filtros.push(filtro4);
                }

                //FILTRO ES LÍQUIDO PRODUCTO
                if (!isEmpty(esLiquidoProducto)) {
                    var filtro6 = {
                        name: 'custrecord_l54_num_liquido_producto',
                        operator: 'IS',
                        values: esLiquidoProducto
                    };
                    filtros.push(filtro6);
                }

                //FILTRO ES CRÉDITO ELECTRÓNICO
                if (!isEmpty(esCreditoElectronico)) {
                    var filtro7 = {
                        name: 'custrecord_l54_num_credito_electronico',
                        operator: 'IS',
                        values: esCreditoElectronico
                    };
                    filtros.push(filtro7);
                }

                var objResultSet = searchSavedPro('customsearch_l54_numeradores_num_util', filtros);

                if (!objResultSet.error) {

                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;

                    if (!isEmpty(resultSet) && resultSet.length > 0) {
                        var idInternoNumerador = resultSet[0].getValue({ name: resultSearch.columns[8] });
                        numeradorPrefijo = resultSet[0].getValue({ name: resultSearch.columns[4] });
                    } else {
                        log.error(proceso, 'No se encuentra configurado correctamente el Numerador. Verifique el panel de Administración. Muchas gracias.');
                    }
                } else {
                    log.error(proceso, 'Error intentando obtener información del SS: "L54 - Numeradores (Numerador a Utilizar)" - Detalles: ' + objResultSet.descripcion);
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepción - devolverPrefijo - Detalles: ' + error.message);
            }
            return numeradorPrefijo;
        }

        function consultarNumeradorCae(tipoTransId, boca, letra, subsidiaria, esLiquidoProducto, esCreditoElectronico) {

            var proceso = 'consultarNumerador';
            var response = { error: false, mensaje: '', idTransAfipParcial: '', codigoMiddleware: '', numeradorElectronico: '', idTransaccionAFIP: '', nroBocaAfip: '' };

            try {
                log.debug(proceso, 'INICIO consultarNumerador - Parámetros - tipoTransId: ' + tipoTransId + ' - boca: ' + boca + ' - letra: ' + letra + ' - subsidiaria: ' + subsidiaria + ' - esLiquidoProducto: ' + esLiquidoProducto + ' - esCreditoElectronico: ' + esCreditoElectronico);

                if (!isEmpty(tipoTransId) && !isEmpty(boca) && !isEmpty(letra)) {

                    var filtros = [];

                    //FILTRO TIPO TRANSACCION
                    if (!isEmpty(tipoTransId)) {
                        var filtro1 = {
                            name: 'custrecord_l54_num_tipo_trans',
                            operator: 'ANYOF',
                            values: tipoTransId
                        };
                        filtros.push(filtro1);
                    }

                    //FILTRO BOCA
                    if (!isEmpty(boca)) {
                        var filtro2 = {
                            name: 'custrecord_l54_num_boca',
                            operator: 'ANYOF',
                            values: boca
                        };
                        filtros.push(filtro2);
                    }

                    //FILTRO LETRA
                    if (!isEmpty(letra)) {
                        var filtro3 = {
                            name: 'custrecord_l54_num_letra',
                            operator: 'ANYOF',
                            values: letra
                        };
                        filtros.push(filtro3);
                    }

                    //FILTRO SUBSIDIARIA
                    if (!isEmpty(subsidiaria)) {
                        var filtro4 = {
                            name: 'custrecord_l54_num_subsidiaria',
                            operator: 'ANYOF',
                            values: subsidiaria
                        };
                        filtros.push(filtro4);
                    }

                    //FILTRO ES LÍQUIDO PRODUCTO
                    if (!isEmpty(esLiquidoProducto)) {
                        var filtro6 = {
                            name: 'custrecord_l54_num_liquido_producto',
                            operator: 'IS',
                            values: esLiquidoProducto
                        };
                        filtros.push(filtro6);
                    }

                    //FILTRO ES CRÉDITO ELECTRÓNICO
                    if (!isEmpty(esCreditoElectronico)) {
                        var filtro7 = {
                            name: 'custrecord_l54_num_credito_electronico',
                            operator: 'IS',
                            values: esCreditoElectronico
                        };
                        filtros.push(filtro7);
                    }

                    var objResultSet = searchSavedPro('customsearch_l54_numeradores_gen_cae', filtros);

                    if (!objResultSet.error) {

                        var resultSet = objResultSet.objRsponseFunction.result;
                        var resultSearch = objResultSet.objRsponseFunction.search;

                        if (!isEmpty(resultSet) && resultSet.length > 0) {
                            response.idTransAfipParcial = resultSet[0].getValue({ name: resultSearch.columns[1] });
                            response.codigoMiddleware = resultSet[0].getValue({ name: resultSearch.columns[2] });
                            response.numeradorElectronico = resultSet[0].getValue({ name: resultSearch.columns[3] });
                            response.idTransaccionAFIP = resultSet[0].getValue({ name: resultSearch.columns[4] });
                            response.nroBocaAfip = resultSet[0].getValue({ name: resultSearch.columns[5] });
                        } else {
                            response.error = true;
                            response.mensaje = 'LINE 1158 - No se encontró ningún resultado del RT numeradores para los datos recibidos por parámetros - tipoTransId: ' + tipoTransId + ' - boca: ' + boca + ' - letra: ' + letra + ' - subsidiaria: ' + subsidiaria + ' - esLiquidoProducto: ' + esLiquidoProducto + ' - esCreditoElectronico: ' + esCreditoElectronico;
                            log.error(proceso, response.mensaje);
                        }
                    } else {
                        response.error = true;
                        response.mensaje = 'Error intentando obtener información del SS: "L54 - Numeradores (Generación de CAE)" - Detalles: ' + objResultSet.descripcion;
                        log.error(proceso, response.mensaje);
                    }
                }
            } catch (error) {
                response.error = true;
                response.mensaje = 'Error NetSuite Excepción consultarNumerador - Detalles: ' + error.message;
                log.error(proceso, response.mensaje);
            }
            return response;
        }

        function obtenerTipoDocumento(tipoDocumentoNetSuite) {

            var proceso = 'obtenerTipoDocumento';

            try {
                if (!isEmpty(tipoDocumentoNetSuite)) {
                    var mySS = search.create({
                        type: 'customrecord_l54_tipo_documento',
                        filters: ['internalid', 'anyof', tipoDocumentoNetSuite],
                        columns: ['internalid', 'custrecord_l54_tipo_doc_afip']
                    }).run().runPaged({
                        start: 0,
                        end: 1
                    });

                    log.debug(proceso, 'Results of obtenerTipoDocumento: ' + JSON.stringify(mySS));

                    if (!isEmpty(mySS) && mySS.length > 0) {
                        return mySS[0].getValue('custrecord_l54_tipo_doc_afip');
                    }
                }
            } catch (error) {
                log.error(proceso, 'Error NetSuite Excepcion - obtenerTipoDocumento - Detalles: ' + error.message);
            }
            return null;
        }

        /**
         * Ejemplo de uso obtener value=
         *      objetoRespuesta.CbtesAsoc[0].PtoVta = utilidades.getLookupFieldsSafe(ptoVentaNroBocaAfip, "custrecord_l54_bocas_nro_afip");
         * Ejemplo de uso obtener text=
         *      const serie = Utilities.getLookupFieldsSafe(resultadoTransaccion, "custbody_l598_serie_comprobante", false); // se quiere el text, no el value
         * 
        * @param {Object} obj https://suiteanswers.custhelp.com/app/answers/detail/a_id/43711/loc/en_US
        * @param {*} field campo que se quiere obtener
        * @param {*} value true si se quiere obtener el value (default), false si es el texto.
        * @return {any} devuelve lo pedido, o undefined, si el field llega a contener un valor plano, se retornara el valor plano no importa que diga el parametro value.
        */
        function getLookupFieldsSafe(obj, field) {
            var value = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
            if (Object.keys(obj).length === 0) return undefined;
            if (obj[field] == undefined) return undefined;
            if (!(obj[field] instanceof Array)) return obj[field];
            if (obj[field][0] == undefined) return undefined;
            if (value) {
                return obj[field][0].value;
            } else {
                return obj[field][0].text;
            }
        }

        return {
            isEmpty: isEmpty,
            l54esOneworld: l54esOneworld,
            searchSavedPro: searchSavedPro,
            getNumeroEnLetras: getNumeroEnLetras,
            getTipoTransId: getTipoTransId,
            numeradorAUtilizarSS: numeradorAUtilizarSS,
            devolverNuevoNumero: devolverNuevoNumero,
            obtenerIDMoneda: obtenerIDMoneda,
            obtenerPuntoVenta: obtenerPuntoVenta,
            getBocaPreferidaParaTrans: getBocaPreferidaParaTrans,
            validarNumerador: validarNumerador,
            existenciaTransaccion: existenciaTransaccion,
            devolverPrefijo: devolverPrefijo,
            getValueFromList: getValueFromList,
            consultarNumeradorCae: consultarNumeradorCae,
            obtenerTipoDocumento: obtenerTipoDocumento,
            getLookupFieldsSafe: getLookupFieldsSafe,
            getNumeracionxLocation: getNumeracionxLocation
        };
    });
