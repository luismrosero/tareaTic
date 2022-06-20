'use strict'

const express = require('express');
const bodyParser = require('body-parser')
const axios = require('axios');
const admin = require("firebase-admin");
const {initializeApp} = require('firebase-admin/app');
const {getDatabase} = require('firebase-admin/database');


const app = express();
const port = process.env.PORT || 3000;
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),

});

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json())

app.get("/webhook", (req, res) => {
    res.send("Bienvenido a mi webhook");
})


app.listen(port, () => {
    // console.log('Servicio corriendo en el puerto ' + port);
})

app.post("/webhook", (req, res) => {
    var data = req.body;

    if (data !== undefined) {
        let playload = data.uplink_message.decoded_payload;
        //   console.log(playload)


        //    console.log("desmon ==> " + desmontado);
        //    console.log("lat ==> " + lat);
        //    console.log("lon ==> " + lon);

        if (playload.tipo && playload.tipo === "panico") {

            let nombre = playload.nombre;
            let alarma = playload.bytes[2];
            let desmontado = playload.bytes[3];

            let lat = playload.lat;
            let lon = playload.lon;
            if (alarma === 1) {

                try {
                    setAlarma(nombre, lat, lon, desmontado);
                    enviarNotificacion(nombre)
                } catch (e) {

                }

            }

            res.sendStatus(200)

        } else if (playload.tipo && playload.tipo === "gps") {

            let nombre = playload.nombre;

            let lat = playload.lat;
            let lon = playload.lon;

            //console.log(lat)

            if (lat === 0 && lon === -360) {

            } else {
                try {
                    setGPS(nombre, lat, lon);
                } catch (e) {

                }
                res.sendStatus(200)
            }


        } else if (playload.tipo && playload.tipo === "apertura") {


          //  console.log(playload.abierto)

            updateApertura(playload.abierto)

        }


        // para la alarma debo tambien decodificar el playload

    }

})


const enviarNotificacion = (dat) => {
    const fcm = "https://fcm.googleapis.com/fcm/send"

    // corregir si imagen

    let message = {

        "to": "/topics/all",
        "priority": "high",
        "notification": {
            "body": "Activo alarma",
            "title": dat,
            "sound": "siren",


        },
        "data": {
            "nombre": dat,
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
        "Authorization": "key=AAAA6TfiKFc:APA91bFZP7SIroAwrhRBejuaplTlY52FhiHp5ULCuiWiNFYwe81UcBxCpVhB6SAwAv1NCnAMLirU9vU-VCPvikNmT-WOAe_2VUlwtfTDKbnHRXZNITBhBcbAsy2CIsTIPQjCbPyvtF6P",
        "Content-Type": "application/json",
    }

    axios.post(fcm, message, {headers}).then((doc) => {
        //  console.log("Enviado")
    }).catch((err) => {
        //  console.log(err.message)
    })
}


const setAlarma = (nom, lat, lon, des) => {

    const db = admin.firestore();

    let ala = {
        id: new Date().getTime() + "ALA",
        nombre: nom,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        fecha: new Date(),
        desmontado: des
    }

    const cityRef = db.collection('alarmas').doc(ala.id);

    cityRef.set(ala, {merge: true}).then((dox) => {
        //  console.log("Subio")
    });

}

const setGPS = (nom, lat, lon) => {

    const db = admin.firestore();

    let ala = {
        id: new Date().getTime() + "GPS",
        nombre: nom,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        fecha: new Date(),
    }

    const cityRef = db.collection('gpss').doc(ala.id);

    cityRef.set(ala, {merge: true}).then((dox) => {
        //  console.log("Subio")
    });

}

const updateApertura = (isAbierto) => {

    const db = admin.firestore();
    const cityRef = db.collection('sensores').doc("puerta");

    cityRef.update({abierta: isAbierto}).then((dox) => {

      //  console.log("Se hizo")

    }).catch((err) =>{
      //  console.log(err.message)
    })
}





