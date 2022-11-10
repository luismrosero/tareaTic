'use strict'

const express = require('express');
const bodyParser = require('body-parser')
const axios = require('axios');
const admin = require("firebase-admin");


const app = express();
const port = process.env.PORT || 3000;
const serviceAccount = require("./serviceAccountKey.json");
const {data} = require("ttn");
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json())


// inicializamos Base de Datos
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

var db = admin.firestore();

// metodo get
app.get("/webhook", (req, res) => {
    res.send("Bienvenido a mi webhook");
})

// aviso de que esta activo
app.listen(port, () => {
   // console.log('Servicio corriendo en el puerto ' + port);
})

// metodo post
app.post("/webhook", (req, res) => {

    let data = validarData(req)
    if (data) {

        let sensor = obtemerSensor(data)
        sensor.consultarDatos().then((dox) => {
            if (dox.res) {
                sensor.actualizarDatos().then((fin) => {
                    if (fin.res) {
                        sensor.enviarAlarma(dox.data).then((doxo) => {
                            sensor.ingresarHistorial(dox.data).then((doxo) => {
                              //  console.log("datos actualizados")
                            });
                        })


                    }
                });
            } else {
                sensor.ingresarSensor().then((dox) => {
                    if (dox.res) {
                       // console.log("ingresado")
                    } else {
                     //   console.log(dox.data)
                    }
                });
            }
        })

        res.sendStatus(200)

    } else {
        res.sendStatus(200)
       // console.log("datos invalidos")
    }


})


//0101010023
//http://44.203.152.44:3000


const enviarNotificacion = (sensor) => {
    const fcm = "https://fcm.googleapis.com/fcm/send"

    let message = {

        "to": "/topics/all",
        "priority": "high",
        "notification": {
            "body": "Ha sido Activada en la fecha: " + sensor.fechDato.toLocaleString('es-CO', {timeZone: 'America/Bogota'}),
            "title": sensor.nombre,
            "sound": "siren",


        },
        "data": {
            "nombre": sensor,
        },

        android: {
            notification: {
                sound: 'siren'
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'siren'
                },
            },
        },
        webpush: {
            notification: {
                sound: 'siren'
            },
        },

    }


    const headers = {
        "Authorization": "key=AAAAMkS_sAM:APA91bFyl6Kdtmq-h4nM3fpwPJE_ssJgz8Jl05hNFUXyfgWbbIsDq47LviH6CxSs6ComMSZBDRUkSaSqvx-kiR5Hulzxx2diVbF4D9sX9m1ZrqQyoR_pR45Eo9-XEFTlGkY6Zm7af9HS",
        "Content-Type": "application/json",
    }

    axios.post(fcm, message, {headers}).then((doc) => {
        //  console.log("Enviado")
    }).catch((err) => {
        //  console.log(err.message)
    })
}


const validarData = (req) => {

    let dat = req.body;
    if (dat
        && dat.uplink_message
        && dat.uplink_message.decoded_payload
        && dat.uplink_message.f_port
        && dat.uplink_message.f_port === 41) {
        return dat.uplink_message.decoded_payload
    } else {
        return null
    }
}


const obtemerSensor = (data) => {

    switch (data.tipo) {
        case "GPS" : {
            return new SensorGPS(data)
        }
    }

}

class Sensor {

    constructor(data) {
        this.id = data.id;
        this.tipo = data.tipo;
        this.data = data
    }

    consultarDatos() {
        return new Promise(resolve => {
            db.collection("sensores").doc(this.id).get().then((dox) => {
                if (dox.exists) {
                    return resolve({res: true, data: dox.data()});
                } else {
                    return resolve({res: false, data: null});
                }
            })
        })


    }



}

class SensorGPS extends Sensor {

    constructor(data) {
        super(data);
        this.id = data.id;
        this.lat = data.lat;
        this.lng = data.lng;
        this.montado = data.montado;
        this.activo = data.activo;
        this.data = data;
    }


    ingresarSensor() {

        return new Promise(resolve => {

            if (this.lat !== 0 && this.lng !== -360){
                db.collection("sensores").doc(this.id).set(this.data).then((dox) => {
                    return resolve({res: true, data: this.id});
                }).catch((err) => {
                    return resolve({res: false, data: err.message})
                })
            }else{
                return resolve({res: false, data: "no ingresado, sin datos de ubicacion"})
            }

        })
    }

    enviarAlarma(config) {

        return new Promise(resolve => {
            if (config.notificacion) {
              //  console.log("Enviando notificacion")
                return resolve({res: true})
            } else {
               // console.log("NO Envio notificacion")
                return resolve({res: false})
            }
        })


    }

    actualizarDatos() {

        let date = new Date();


        let datosNuevos = {
            lat: this.lat,
            lng: this.lng,
            fecha: date,
        }

        return new Promise(resolve => {

            if (datosNuevos.lat !== 0 && datosNuevos.lng !== -360){
                db.collection("sensores").doc(this.id).update(datosNuevos).then((dox) => {
                    return resolve({res: true, data: null})
                }).catch((err) => {
                   // console.log(err.message)
                    return resolve({res: false, data: err.message})

                })
            }else{
                return resolve({res: false, data: "Encontrando Ubicacion"})
            }



        })


    }

    ingresarHistorial(config) {

        let his = {
            id: new Date().getTime() + "HIS",
            idSensor: this.id,
            fecha: new Date(),
            lat: this.lat,
            lng: this.lng,
            activo: this.activo,
            montado: this.montado,
        }

        return new Promise(resolve => {

            if (config.historial) {
                db.collection("historial/gps/" + this.id).doc(his.id).set(his).then((dox) => {
                   // console.log("Historial Adicionado")
                    return resolve({res: true, data: null})
                }).catch((err) => {
                    return resolve({res: false, data: err.message})
                })
            } else {
                return resolve({res: false, data: null})
            }

        })

    }


}