//Interface Concept
function add(a, b) {
    if (b) {
        return a + b;
    }
    else {
        return a;
    }
}
console.log(add(1, 2));
console.log(add("Krishan", "Lal"));
console.log(add("vicky"));
