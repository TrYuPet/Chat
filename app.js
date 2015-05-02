//подключаем наш express фреймвок
var express = require('express');
//модули http
var http = require('http');
var path = require('path');

var config = require('config');
var log = require('lib/log')(module);
var mongoose = require('lib/mongoose');
var HttpError = require('error').HttpError;

//Функция обработки запросов
var app = express();

// почти тоже самое, что и ejs только есть возможности layout, partial, blok
//engine. т.к файлы с таким расширением ejs, нужно обрабатывать как ejs-locals
app.engine('ejs', require ('ejs-locals'));

//указывает местоположение шаблонов
app.set('views', __dirname + '/template');

//дижок шаблонов
app.set('view engine', 'ejs');

//читает иконку или иначе передает управление дальше
app.use(express.favicon()); // /favicon.ico

//смотрит какой пришел запрос
if (app.get('env') == 'development') {
    app.use(express.logger('dev'));
} else {
    app.use(express.logger('default'));
}
//считывает формы методом post
app.use(express.bodyParser());  // доступны в req.body....

//парсит куки
app.use(express.cookieParser()); // req.cookies

/*// соединение с БД
var MongoClient = require('mongodb').MongoClient,
    format = require('util').format;

var userListDB, chatDB;

// подсоединяемся к БД
MongoClient.connect('mongodb://127.0.0.1:27017', function (err, db) {
    if (err) {throw err}

    // записываем ссылки на таблицы (коллекции) в глобальные переменные
    userListDB = db.collection('users');
    chatDB = db.collection('chat');
});

*/
//  ----- /// var sessionStore = require('lib/sessionStore');
//var MongoStore = require('connect-mongo')(express);

app.use(express.session({
    secret: config.get('session:secret'),
    key: config.get('session:key'),
    cookie: config.get('session:cookie'),
//  ----- ///    store: sessionStore
    store: require('lib/sessionStore')
}));

app.use(require('middleware/sendHttpError'));
app.use(require('middleware/loadUser'));

//обрабатывает необходимые запросы нужным способом
app.use(app.router);

require('routes')(app);

app.use(express.static(path.join(__dirname, 'public')));

//обработчик ошибок
app.use(function(err, req, res, next) {
    if (typeof err == 'number') { // next(404);
        err = new HttpError(err);
    }

    if (err instanceof HttpError) {
        res.sendHttpError(err);
    } else {
        if (app.get('env') == 'development') {
            express.errorHandler()(err, req, res, next);
        } else {
            log.error(err);
            err = new HttpError(500);
            res.sendHttpError(err);
        }
    }
});

//создаем http сервер
var server = http.createServer(app);
//подключаем порт
server.listen(config.get('port'), function(){
    log.info('Express server listening on port ' + config.get('port'));
});

require('./socket')(server);
var io = require('./socket')(server);
app.set('io', io);