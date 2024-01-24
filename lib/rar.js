'use strict';

const fs = require('fs');
const {stat} = fs.promises;
const path = require('path');
const {inherits} = require('util');
const {EventEmitter} = require('events');

const through = require('through2');
const tryToCatch = require('try-to-catch');

//import { unpack } from 'node-unar';
var unpack;
(async () => {
    try {
       const Unar = await import('node-unar');
       unpack = Unar.unpack;
    } catch (error) {
      console.error('Error importing ECMAScript module:', error);
    }
})();

inherits(unRAR, EventEmitter);

module.exports = (from, to) => {
    const emitter = new unRAR(from, to);
    
    process.nextTick(() => {
        emitter._start();
    });
    
    return emitter;
};

function unRAR(from, to) {
    EventEmitter.call(this);
    
    const name = path.basename(from.replace(/\.rar/, ''));
    
    this._from = from;
    this._to = require('path').dirname( from )//path.join(to, name);
    this._i = 0;
    this._n = 0;
    this._percent = 0;
    this._percentPrev = 0;
}

unRAR.prototype._start = async function() {
    const from = this._from;
    const to = this._to;
    
    const [statError, statData] = await tryToCatch(stat, from);
    
    if (statError)
        return this.emit('error', statError);
    
    if (!statData.size)
        return this.emit('error', Error('archive is empty'));
    
    this._n = statData.size;
    
    
    unpack(from, to)
    .progress((eachFle) => {
        this._progress()
    })
    .then((results) => {
        this.emit('file', path.basename(to));        
        this.emit('end');
    })
    .catch((anyError) => {
        return this.emit('error', anyError);
    });
            
    

};

unRAR.prototype.getProgressStream = function() {
    return through((chunk, enc, callback) => {
        this._i += chunk.length;
        this._progress();
        callback(null, chunk);
    });
};

unRAR.prototype._progress = function() {
    const value = Math.round(this._i * 100 / this._n);
    
    this._percent = value;
    
    if (value !== this._percentPrev) {
        this._percentPrev = value;
        this.emit('progress', value);
    }
};

