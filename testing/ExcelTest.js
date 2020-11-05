var XLSX=require('xlsx');
var workbook = XLSX.readFile('./test.xlsx');
var first_sheet_name = workbook.SheetNames[0];
// var first_sheet_name="LoginTest";
var address_of_cell = 'B2';
var worksheet = workbook.Sheets[first_sheet_name];
/* Find desired cell */
var desired_cell = worksheet[address_of_cell];
/* Get the value */
var desired_value = (desired_cell ? desired_cell.v : undefined);
console.log(desired_value);
