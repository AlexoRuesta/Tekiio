    /**
     *@NApiVersion 2.1
    */
     define(["N/record", "N/email"], function (record, email) {

        class sendEmail {
            constructor() {
            }

            init = () => {
                log.error("Inicio CLASS");
            }

            email = (author, recipients, subject, body) => {
                return  email.send({
                    author,
                    recipients,
                    subject,
                    body
                });
            }

            getValuesEmployee = (EmployeeID) => {
                let customEmployee =  record.load({ type: "employee", id: EmployeeID});
                return {
                    email     : customEmployee.getValue("email"),
                    firstname : customEmployee.getValue("firstname"),
                    lastname  : customEmployee.getValue("lastname")
                }
            }

            getMessageBodyComplete = (nameProcess, link, type, extra) => {
                log.debug("params", nameProcess + " ->> " + link)
                let body = "";
                    body += "<p>Estimado(a) :</p>";
                
                if(type)  body += "<p>Se ejecutó correctamente el proceso " + nameProcess + ".</p>";
                else      body += "<p>Ocurrio un error en uno o más registros del proceso " + nameProcess + ".</p>";

                if(extra) body += extra;

                if(link)  body += "<p>Para visualizar mayor detalle entre al siguiente <a href=\"https://"+ link + "\">enlace.</a>  </p>";
                
                    body += "<p>Atentamente.</p>";
                    body += "<br>";
                    body += "<p><strong>***NO RESPONDA A ESTE MENSAJE***</strong></p>";
                
                return body; 
            }

            getMessageBodyCatch = (nameScript, alert) => {
                let body = "";
                    body += "<p>Estimado(a) :</p>";
                    body += "<p>Se ha generado un error al intentar ejecutar el script " + nameScript + ".</p>";
                    body += "<p>Detalles del error ocurrido: Codigo de Error - " + alert.name + ". Mensaje -  " + alert.message + ".</p>";
                    body += "<p>Atentamente,</p>";
                    body += "<br>";
                    body += "<p><strong>***NO RESPONDA A ESTE MENSAJE***</strong></p>";
                
                return body; 
            }

        }

        roundTwoDecimal = (value) => {
            return Math.round(Number(value) * 100) / 100;
        }

        return {
            sendEmail
        }
    })