
describe("test calculator functionality",function(){
    var expected_test;
    
    beforeEach(function(){
    browser.get("http://www.way2automation.com/angularjs-protractor/calc/");
    element(by.model("first")).sendKeys("7");
    element(by.model("second")).sendKeys("7");
    element(by.buttonText("Go!")).click();
    expected_test=element(by.binding("latest")).getText();
    });
    
    afterEach(function(){
    browser.sleep(3000);
    console.log("after it block");
    });
    
    it("validate 7+7=14",function(){
    expected_test.then(function(text){
    console.log("Result is :"+text);
    expect(parseInt(text)).toBe(14);
    });
    });
    
    it("validate 7+7!=10",function(){
    expected_test.then(function(text){
    console.log("Result is :"+text);
    expect(parseInt(text)).not.toBe(10);    
    });
    });
    
    it("validate 7+7=13",function(){
    expected_test.then(function(text){
    console.log("Result is :"+text);
    expect(parseInt(text)).not.toBe(13);
    });
    });
    });