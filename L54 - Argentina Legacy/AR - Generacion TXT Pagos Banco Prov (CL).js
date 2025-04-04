/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/ui/dialog', 'N/search'],

    function (currentRecord, dialog, search) {

        const CAMPO_CBU = 'custpage_nrocbucliente';
        const CAMPO_NRO_CUENTA = 'custpage_nrocuentacliente';
        const BANCO = 'custpage_bancocliente';

        var isEmpty = function (val) { return val == null || val == undefined || val == '' };

        function saveRecord(context) {
            var accion = currentRecord.get().getValue({ fieldId: 'custpage_accion' });

            if (accion != 'GENERAR' && accion != 'BUSCAR') {

                var options = {
                    title: "Atencion",
                    message: "Este proceso puede tardar algunos segundos. ¿Desea continuar?"
                };

                function success(result) {
                    console.log('El usuario selecciono: ' + result);
                    if (result == true) {
                        var record = currentRecord.get();

                        record.setValue({
                            fieldId: 'custpage_accion',
                            value: 'GENERAR'
                        });

                        document.forms['main_form'].submitter.click();
                    }
                }

                function failure(reason) {
                    console.log('Algo fallo al intentar ejecutar el proceso!');
                    return false;
                }

                dialog.confirm(options).then(success).catch(failure);
            } else {

                return true;
            }
        }

        function buscarPagos() {
            var record = currentRecord.get();

            record.setValue({
                fieldId: 'custpage_accion',
                value: 'BUSCAR'
            });
            document.forms['main_form'].submitter.click();
        }

        const fieldChanged = function (context) {

            var rec = currentRecord.get();
            var field = context.fieldId;


            if (field == 'custpage_datobanco') {

                var datoID = rec.getValue('custpage_datobanco');
                console.log('datoID: ' + datoID);
                if (isEmpty(datoID)) {
                    rec.setValue({ fieldId: CAMPO_CBU, value: '' });
                    rec.setValue({ fieldId: CAMPO_NRO_CUENTA, value: '' });
                    rec.setValue({ fieldId: BANCO, value: '' });
                    console.log('estaba vacio DatoID');
                } else {
                    var objFieldLookUp = search.lookupFields({
                        type: 'customrecord_l54_txtbank_file_datos_banc',
                        id: datoID,
                        columns: ['custrecord_l54_txtbank_dato_cbu', 'custrecord_l54_txtbank_dato_nro_cta','custrecord_l54_txtbank_dato_banco']
                    });
                    var nroCBU = objFieldLookUp.custrecord_l54_txtbank_dato_cbu;
                    var nroCuenta = objFieldLookUp.custrecord_l54_txtbank_dato_nro_cta;
                    var bancoEmisor = objFieldLookUp.custrecord_l54_txtbank_dato_banco[0].value;
                    console.log('nroCBU: ' + nroCBU);
                    console.log('nroCuenta: ' + nroCuenta);
                    console.log('bancoEmisor: ' + JSON.stringify(bancoEmisor));
                    if (!isEmpty(nroCBU)) {
                        rec.setValue({ fieldId: CAMPO_CBU, value: nroCBU })
                    }else{
                        rec.setValue({ fieldId: CAMPO_CBU, value: '' })
                    }

                    if (!isEmpty(nroCuenta)) {
                        rec.setValue({ fieldId: CAMPO_NRO_CUENTA, value: nroCuenta })
                    }else{
                        rec.setValue({ fieldId: CAMPO_NRO_CUENTA, value: '' })
                    }

                    if (!isEmpty(bancoEmisor)) {
                        rec.setValue({ fieldId: BANCO, value: bancoEmisor })
                    }else{
                        rec.setValue({ fieldId: BANCO, value: '' })
                    }
                    console.log('Finalice');
                }
            }

            return true;
        }


        return {
            saveRecord: saveRecord,
            buscarPagos: buscarPagos,
            fieldChanged: fieldChanged
        }
    });
