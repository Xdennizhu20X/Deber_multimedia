const express = require('express');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
const puerto = 3000;


app.get('/imagen', (req, res) => {
    const rutaEntrada = path.join(__dirname, 'media', 'input.jpg');
    
    
    if (!fs.existsSync(rutaEntrada)) {
        return res.status(404).send('Imagen no encontrada');
    }
    
    sharp(rutaEntrada)
        .resize(300, 300)
        .toBuffer()
        .then(data => {
            res.type('image/jpeg');
            res.send(data);
        })
        .catch(err => {
            console.error('Error al procesar la imagen:', err);
            res.status(500).send('Error al procesar la imagen');
        });
});


app.get('/audio', (req, res) => {
    const rutaEntrada = path.join(__dirname, 'media', 'input.mp3');
    const rutaSalida = path.join(__dirname, 'media', 'output.wav');

    
    if (!fs.existsSync(rutaEntrada)) {
        return res.status(404).send('Archivo de audio no encontrado');
    }

    ffmpeg(rutaEntrada)
        .toFormat('wav')
        .on('end', () => {
            res.type('audio/wav');
            res.sendFile(rutaSalida, (err) => {
                if (err) {
                    console.error('Error al enviar el archivo de audio:', err);
                    res.status(500).send('Error al enviar el archivo de audio');
                } else {
                    
                    fs.unlinkSync(rutaSalida);
                }
            });
        })
        .on('error', (err) => {
            console.error('Error al procesar el audio:', err);
            res.status(500).send('Error al procesar el audio');
        })
        .save(rutaSalida);
});

app.get('/video', (req, res) => {
    const rutaEntrada = path.join(__dirname, 'media', 'input.mp4');
    
    if (!fs.existsSync(rutaEntrada)) {
        return res.status(404).send('Archivo de video no encontrado');
    }

    const stat = fs.statSync(rutaEntrada);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const partes = range.replace(/bytes=/, "").split("-");
        const inicio = parseInt(partes[0], 10);
        const fin = partes[1] ? parseInt(partes[1], 10) : fileSize - 1;
        const tamanioChunk = (fin - inicio) + 1;
        const archivo = fs.createReadStream(rutaEntrada, { start: inicio, end: fin });
        const cabecera = {
            'Content-Range': `bytes ${inicio}-${fin}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': tamanioChunk,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, cabecera);
        archivo.pipe(res);
    } else {
        const cabecera = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, cabecera);
        fs.createReadStream(rutaEntrada).pipe(res).on('error', (err) => {
            console.error('Error al transmitir el video:', err);
            res.status(500).send('Error al transmitir el video');
        });
    }
});

app.listen(puerto, () => {
    console.log(`Servidor está ejecutándose en http://localhost:${puerto}`);
});
