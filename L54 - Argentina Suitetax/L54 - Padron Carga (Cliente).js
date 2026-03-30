/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/ui/dialog'],
    function (currentRecord, dialog) {

        function pageInit(context) {
            var currentRecord = context.currentRecord;
            
            
            var arbaEmbargo = currentRecord.getValue({
                fieldId: 'custpage_padron_embargo'
            });

            var tipoPadron = currentRecord.getValue({
                fieldId: 'custpage_padron'
            });
            
            if(arbaEmbargo == tipoPadron){
                // acá puedes modificar otros campos
                currentRecord.setValue({
                    fieldId: 'custpage_tipo_consulta_padron',
                    value: 2
                });
                    var tipoConsulta = currentRecord.getField({
                    fieldId: 'custpage_tipo_consulta_padron'
                });
                tipoConsulta.isDisabled = true;
            }else{
                var tipoConsulta = currentRecord.getField({
                    fieldId: 'custpage_tipo_consulta_padron'
                });
                tipoConsulta.isDisabled = false;
            }
            
            
        }

    function saveRecord(context) {

        if(currentRecord.get().getValue({fieldId : 'custpage_accion'}) != 'GENERAR') {

            var options = {
                title: "Atencion",
                message: "Este proceso puede tardar algunos segundos, no debe cerrar la ventana durante la ejecución. ¿Desea continuar?"
            };

            function success(result) {
                console.log('El usuario selecciono: ' + result);
                if(result == true){
                    var record = currentRecord.get();

                    record.setValue({
                        fieldId : 'custpage_accion',
                        value : 'GENERAR'
                    });                    

                    document.forms['main_form'].submitter.click();    
                }
            }

            function failure(reason) {
                console.log('Algo fallo al intentar ejecutar el proceso!');
                return false;
            }

            dialog.confirm(options).then(success).catch(failure);
        } else{

            var html = '<font color="blue">' + 'Consultando registros de Padron...' + '</font><br><font>' + '(Por favor espere, ¡No cierre esta ventana!)' + '</font>';
            var idNetsuiteContainer = 'custpage_resultado_fs';

            javascript:document.getElementById(idNetsuiteContainer).innerHTML = html;

            return true;
        }
    }   

    function fieldChanged(context) {
        var currentRecord = context.currentRecord;
        
        if (context.fieldId === 'custpage_padron') {
            var arbaEmbargo = currentRecord.getValue({
                fieldId: 'custpage_padron_embargo'
            });

            var tipoPadron = currentRecord.getValue({
                fieldId: 'custpage_padron'
            });
            
            if(arbaEmbargo == tipoPadron){
                // acá puedes modificar otros campos
                currentRecord.setValue({
                    fieldId: 'custpage_tipo_consulta_padron',
                    value: 2
                });
                 var tipoConsulta = currentRecord.getField({
                    fieldId: 'custpage_tipo_consulta_padron'
                });
                tipoConsulta.isDisabled = true;
            }else{
                var tipoConsulta = currentRecord.getField({
                    fieldId: 'custpage_tipo_consulta_padron'
                });
                tipoConsulta.isDisabled = false;
            }
           
        }
    }

    function status() {
        var record = currentRecord.get();

        record.setValue({
            fieldId : 'custpage_accion',
            value : 'STATUS'
        });

        document.forms['main_form'].submitter.click();
    }

    return {
        pageInit:pageInit,
        saveRecord: saveRecord,
        fieldChanged: fieldChanged,
        status: status
    };
});