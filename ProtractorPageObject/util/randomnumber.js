var randomnumer=function()
{
    this.randomno=function()
    {
let a=1
let b=10000
let c=a+(b-a)*Math.random()
console.log(Math.round(c))
return Math.round(c);
}
}

module.exports= new randomnumer();