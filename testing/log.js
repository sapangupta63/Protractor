var winston=require('winston');
winston.remove(winston.transports.Console);
winston.remove(winston.transports.Console, { timestamp: true});
winston.add(winston.transports.File, { filename: 'winston-basic.log'});
module.exports=winston;

