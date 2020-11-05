class Mobile
{
modelnew = 'onePlus'
#unlockpin = 1234

makeCall()
{
    console.log("calling");
}

}
const mob=new Mobile();
console.log(mob.modelnew);
mob.makeCall();

//exports.mob=Mobile;
module.exports=new Mobile();