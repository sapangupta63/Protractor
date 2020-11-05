describe("Hnadling Tab",function(){

    beforeEach(function(){
      browser.ignoreSynchronization=true;
      browser.get("http://demo.automationtesting.in/Windows.html");
    })

 it("Handling windows",  function(){
  let firstwindow;
  let secondwindow;
  element(by.xpath("//*[@id='Tabbed']/a/button")).click();
  var windowhandles=browser.getAllWindowHandles();
  windowhandles.then(function(handle){
  firstwindow=handle[0];
  secondwindow=handle[1];
  browser.switchTo().window(secondwindow)
  browser.getTitle().then(function(text){

    console.log("Title of second window is :"+text);
  })
  browser.close();
  browser.sleep(2000);

  browser.switchTo().window(firstwindow)
  browser.getTitle().then(function(text){

    console.log("Title of first window is :"+text);
  })
  browser.close();

})


  })

 


 


})