/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
*/
define(["N/url", "N/https", "N/currentRecord", "N/record", "N/search", "N/ui/dialog"], function (url, https, currentRecord, record, search, dialog) {

    const pageInit = (scriptContext) => {
        console.log("START CLIENT SCRIPT");
        currentRecord = currentRecord.get();
    }
    
    const setConfiguration = (parent) => {
        try {
            var messague  = {
                title: "Atencion",
                message:`El proceso se ejecutará automáticamente según la configuración registrada.<br>
                        Las subsidiarias seleccionadas, se asignarán a aquellos registros de los records types que se señalan en la solapa Subsidiarias - Records.<br>
                        Los roles seleccionados se asignarán a todos los scripts señalados en la solapa Scripts. Para aquellos de scripts de tipo Suitelet se le asignarán todos los roles.<br>
                        Los roles serán agregados a todos los record types señalados en la solapa Records con nivel de permiso completo, sin modificar los ya existentes.<br>
                        Las importaciones de la solapa Importaciones CSV se comenzarán a ejecutar.<br>
                        <br>
                        <b>Este proceso puede demorar un poco, se le enviará un correo al finalizar</b> ¿Desea continuar?`
            };
        
            console.log("messague".messague);

            function success(result) {
                console.log("El usuario selecciono: " + result);
                if (result == true) {
                    console.log("aqui fallo", parent);

                    var objEntity = record.load({
                        type:"customrecord_tk_configuration_general",
                        id: parent
                    });

                        objEntity.setValue("custrecord_tk_configuration_general_chec", false)  
                        objEntity.setValue("custrecord_tk_configuration_general_stat", true)  
                        objEntity.save(); 
                        
                    var configuration = getValuesConfiguration(parent);

                    var obj = {};
                        obj.parent = parent;
                        obj.subs   = configuration.Subsidiaries;
                        obj.roles  = configuration.Roles;
                    //var informacionTransaccionJson = JSON.stringify(informacionTransaccion);
                    
                    const new_url = url.resolveScript({
                        scriptId: "customscript_tk_sl_process_information",
                        deploymentId: "customdeploy_tk_sl_process_information"
                      });
  
                    const response = https.post({
                        url: new_url,
                        body: obj,
                    });

                    window.location.reload();
                    

                }
            }

            function failure(reason) {
                console.log("Algo fallo al intentar ejecutar el proceso!", reason);
                return false;
            }

            dialog.confirm(messague).then(success).catch(failure);
            return true;
        } catch (error) {
            console.log("Error en setConfiguration", error);
        }
    }

    const getValuesConfiguration = (configuration) => {
           
        var arrayRol = [], arraySub = [];
        var fieldLookUp = search.lookupFields({
            type: "customrecord_tk_configuration_general",
            id: configuration,
            columns: ["custrecord_tk_configuration_general_sub", "custrecord_tk_configuration_general_rol"]
        });

        log.debug( " fieldLookUp ",fieldLookUp)
        let arrSub = fieldLookUp.custrecord_tk_configuration_general_sub,
            arrRol = fieldLookUp.custrecord_tk_configuration_general_rol;

        if(arrRol.length != 0){
            arrRol.forEach(element => {
                arrayRol.push(element.value);
            });
        }

        if(arrSub.length != 0){
            arrSub.forEach(element => {
                arraySub.push(element.value);
            });
        }

        return {
            Subsidiaries: arraySub,
            Roles: arrayRol
        };
    }

    return {
        pageInit,
        setConfiguration
    }
})