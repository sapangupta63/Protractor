describe('Handling Angular app',function(){
it('Dropdown Handling',function(){

browser.get("http://www.way2automation.com/angularjs-protractor/banking/#/login")
element(by.buttonText('Customer Login')).click();
expect(browser.getTitle()).toContain('Protractor');
// element.all(by.css('#userSelect option')).getText().then((element)=>{

//     console.log(element.length)
//     console.log(element)
// })

element.all(by.css('#userSelect option')).then(function(items){
let size=items.length
console.log("Total items in dropdown  "+size);
Array.from(items).forEach(function(element){

    element.getText().then(function(text){
     console.log(text)

    }).catch(function(error){
        console.log("Error Occured")
        throw error
    })

})
element(by.css('#userSelect')).element(by.cssContainingText('option','Harry Potter')).click();
//element(by.model("custId")).$("[value='2']").click();
element(by.buttonText("Login")).click();
element(by.binding("user")).getText().then(function(text){
console.log(text);
expect(text).toContain("Harry");
})

expect(element(by.binding("user")).getText()).toEqual("Harry Potter");
browser.sleep(3000);

})




})
})