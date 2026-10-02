n, d = 3, 2
a = [[i for i in range(n**(2*d))]]*(n**2)

def print_matrix(array):
    for x in array:
        for y in x:
            print(str(y).ljust(3), end=" ")
        print()

def make_squares(array):
    copy = []
    for row in range(n**(d+1)):
        for col in range(n**(d+1)):
            x = n*(row//(n**d))+col//(n**d)
            y = (n**d)*(row%(n**d))+col%(n**d)
            copy.append(array[x][y])
    return copy

def print_as_matrix(list):
    n=int(len(list)**0.5)
    for i in range(n**2):
        print(str(list[i]).ljust(3), end="")
        if i%n == n-1:
            print()

print_matrix(a)
print()
print_as_matrix(make_squares(a))