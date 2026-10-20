n = open("new_mat.csv", "w") 
n.write("matricule\n")
for email in open('matricule.csv') :
    email = email.split('@')[0] + '\n'
    print(email)
    n.write(email)
n.close()