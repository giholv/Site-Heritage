/* Criando a Api de cadastro de Usuario */
import express from express

const app = express();
app.get('/users', (request, response) => {
  response.send('Lista de usuarios');

});
app.listen(3000);