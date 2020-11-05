describe("handling checkbox functionality",function(){
it("handling checkbox",function(){
browser.ignoreSynchronization=true;
browser.get("http://www.tizag.com/htmlT/htmlcheckboxes.php");

var checkboxvalue=function(index)
{
    element(by.xpath('//div[4]/input['+index+']')).getAttribute('value').then(function(text){
    console.log(text+" values getting from "+index);

    });
}

for(var i=1;i<=4;i++)
{
    element(by.xpath('//div[4]/input['+i+']')).click();
    checkboxvalue(i);
    browser.sleep(2000);
}



});




});