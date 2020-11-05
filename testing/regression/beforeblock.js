describe("Multiple IT Testing",function(){
beforeEach(function(){
browser.get("http://www.way2automation.com/angularjs-protractor/calc/")
element(by.model("first")).sendKeys("1");
element(by.model("second")).sendKeys("1");
element(by.buttonText("Go!")).click();
expected_test=element(by.binding("latest")).getText()
title=browser.getTitle()
})

afterEach(function(){
browser.sleep(3000)
console.log("After IT Block")

})

it("to be example",function(){
    expected_test.then(function(text){
    console.log("Result "+text);
    expect(parseInt(text)).toBe(2);

    })
   
})


    it("not to be example",function(){
        expected_test.then(function(text){
            console.log("Result "+text);
            expect(parseInt(text)).not.toBe(20);
        
        })

})



it("Equal example",function(){

title.then(function(text){
console.log("Title is "+text);
expect(title).toEqual('Protractor practice website - Calculator');

})

})


it("Not Equal example",function(){

    title.then(function(text){
    console.log("Title is "+text);
    expect(title).not.toEqual('Not Protractor practice website - Calculator');
    
    })
    
    })

    it("Match",function(){

        title.then(function(text){
        console.log("Title is "+text);
        expect(title).toMatch('practice');
        
        })
        
        })

})