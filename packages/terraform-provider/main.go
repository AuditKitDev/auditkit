// AuditKit Terraform Provider
//
// This provider allows managing AuditKit resources via Terraform.
// It uses the Terraform Plugin Framework (hashicorp/terraform-plugin-framework).

package main

import (
	"context"
	"log"

	"github.com/hashicorp/terraform-plugin-framework/providerserver"
)

func main() {
	opts := providerserver.ServeOpts{
		Address: "registry.terraform.io/auditkit/auditkit",
	}

	err := providerserver.Serve(context.Background(), New, opts)
	if err != nil {
		log.Fatal(err.Error())
	}
}
